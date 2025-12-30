import { createClient } from "@supabase/supabase-js";

// In Vercel serverless functions, use process.env (not import.meta.env)
// Also check both VITE_SUPABASE_URL and SUPABASE_URL (Vercel might not have VITE_ prefix)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key (not anon key)

export default async function handler(req, res) {
  // Enable CORS for all origins (since this is called from browser)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, todoistToken } = req.body;

  if (!userId || !todoistToken) {
    return res.status(400).json({ error: "Missing userId or todoistToken" });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
    });
    return res
      .status(500)
      .json({
        error: "Server configuration error: Missing Supabase credentials",
      });
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
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return res.status(500).json({
      error: error.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
