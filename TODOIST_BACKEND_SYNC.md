# Todoist Backend Sync Implementation Guide

## Overview

To avoid CORS issues and regularly sync Todoist completion data, you'll need to:

1. Create a database table to store completions (see `database/create_todoist_completions_table.sql`)
2. Create a server-side function (Vercel serverless function, cron job, etc.) to fetch from Todoist API
3. Update the frontend to fetch completion data from Supabase instead of Todoist

## Architecture

```
Frontend (React)
    ↓ fetches
Supabase Database (todoist_completions table)
    ↑ writes
Backend Service (Vercel Serverless Function / Cron Job)
    ↓ fetches
Todoist Sync API v9
```

## Step 1: Create Database Table

Run the SQL migration file:

```bash
database/create_todoist_completions_table.sql
```

This creates the `todoist_completions` table with:

- `user_id` - Links to authenticated user
- `task_id` - Todoist task ID (string)
- `completion_date` - Date when task was completed
- Unique constraint on (user_id, task_id, completion_date)

## Step 2: Create Backend Sync Function

### Option A: Vercel Serverless Function (Recommended)

Create `api/todoist/sync-completions.js`:

```javascript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key (not anon key)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, todoistToken } = req.body;

  if (!userId || !todoistToken) {
    return res.status(400).json({ error: "Missing userId or todoistToken" });
  }

  try {
    // Fetch completions from Todoist Sync API (server-side, no CORS)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const response = await fetch(
      "https://api.todoist.com/sync/v9/activity/get",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${todoistToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object_type: "item",
          event_type: "completed",
          limit: 500,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status}`);
    }

    const data = await response.json();
    const events = data.events || [];

    // Process events and prepare for database insertion
    const completions = [];
    const formatDate = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    };

    events.forEach((event) => {
      const taskId = event.object_id || event.item_id;
      let eventDate = null;

      if (event.event_date) eventDate = new Date(event.event_date);
      else if (event.date_completed) eventDate = new Date(event.date_completed);
      else if (event.created_at) eventDate = new Date(event.created_at);

      if (eventDate && eventDate >= startOfMonth && eventDate <= endOfMonth) {
        completions.push({
          user_id: userId,
          task_id: String(taskId),
          completion_date: formatDate(eventDate),
        });
      }
    });

    // Upsert completions into Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (completions.length > 0) {
      const { error } = await supabase
        .from("todoist_completions")
        .upsert(completions, {
          onConflict: "user_id,task_id,completion_date",
        });

      if (error) {
        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      synced: completions.length,
    });
  } catch (error) {
    console.error("Error syncing Todoist completions:", error);
    return res.status(500).json({ error: error.message });
  }
}
```

### Option B: Scheduled Cron Job

You can set up a cron job (using Vercel Cron, GitHub Actions, or a service like cron-job.org) that:

- Runs daily or hourly
- Authenticates as each user (or uses a service account)
- Fetches completion data from Todoist
- Stores it in Supabase

## Step 3: Store Todoist Tokens Securely

You'll need to store Todoist access tokens securely. Options:

### Option A: Store in Supabase Database

Create a `user_todoist_tokens` table:

```sql
CREATE TABLE IF NOT EXISTS user_todoist_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Users can only see their own token
ALTER TABLE user_todoist_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own todoist token" ON user_todoist_tokens
  FOR SELECT USING (auth.uid() = user_id);
```

Update the OAuth callback to store the token in the database.

### Option B: Store Encrypted in User Metadata

Store tokens in `auth.users.user_metadata` (encrypted if possible).

## Step 4: Update Frontend to Fetch from Supabase

Update `src/lib/supabase.js`:

```javascript
// Fetch completions from Supabase database (instead of Todoist API)
export const getTodoistCompletionsFromDB = async (taskIds = []) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = formatDateKey(startOfMonth);
    const endDate = formatDateKey(endOfMonth);

    let query = supabase
      .from("todoist_completions")
      .select("task_id, completion_date")
      .eq("user_id", user.id)
      .gte("completion_date", startDate)
      .lte("completion_date", endDate);

    if (taskIds.length > 0) {
      query = query.in("task_id", taskIds.map(String));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Group by task_id
    const completionsByTask = {};
    data.forEach((completion) => {
      if (!completionsByTask[completion.task_id]) {
        completionsByTask[completion.task_id] = { dates: [] };
      }
      if (
        !completionsByTask[completion.task_id].dates.includes(
          completion.completion_date
        )
      ) {
        completionsByTask[completion.task_id].dates.push(
          completion.completion_date
        );
      }
    });

    return completionsByTask;
  } catch (err) {
    console.error("Error fetching todoist completions from database:", err);
    throw err;
  }
};
```

## Step 5: Trigger Sync from Frontend

Add a function to trigger the sync (callable from a button or automatically):

```javascript
// Trigger backend sync
export const syncTodoistCompletions = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    // Get Todoist token (from database or localStorage)
    const token = localStorage.getItem(`todoist_token_${user.id}`);
    if (!token) {
      throw new Error("Todoist not connected");
    }

    // Call backend sync endpoint
    const response = await fetch("/api/todoist/sync-completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        todoistToken: token,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (err) {
    console.error("Error syncing Todoist completions:", err);
    throw err;
  }
};
```

## Step 6: Schedule Regular Syncs

### Using Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/todoist/sync-all-completions",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs every 6 hours. The endpoint would fetch all users with Todoist tokens and sync their completions.

## Security Considerations

1. **Service Role Key**: Store `SUPABASE_SERVICE_ROLE_KEY` as an environment variable (never commit it)
2. **Todoist Tokens**: Store securely (database with encryption, or encrypted user metadata)
3. **Rate Limiting**: Implement rate limiting on sync endpoints
4. **Authentication**: Verify user identity before syncing
5. **Error Handling**: Log errors but don't expose sensitive data

## Benefits

✅ No CORS issues (server-side API calls)
✅ Faster frontend (reads from local database)
✅ Can sync on schedule (background jobs)
✅ Better data reliability (database as source of truth)
✅ Can add caching, aggregation, analytics
✅ Works offline (once synced)
