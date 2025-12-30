import { createClient } from "@supabase/supabase-js";

// In Vercel serverless functions, use process.env (not import.meta.env)
// Note: VITE_ prefixed vars are only available at build time, not runtime
// Check both with and without VITE_ prefix
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://uwwsqjdvhtgfyehusbos.supabase.co"; // Fallback for testing
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

  const { userId, todoistToken, timezone } = req.body;

  if (!userId || !todoistToken) {
    return res.status(400).json({ error: "Missing userId or todoistToken" });
  }

  // Use provided timezone or default to America/Los_Angeles (Pacific)
  const userTimezone = timezone || "America/Los_Angeles";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase configuration:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey,
    });
    return res.status(500).json({
      error: "Server configuration error: Missing Supabase credentials",
    });
  }

  try {
    // Fetch completions from Todoist Sync API (server-side, no CORS)
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Todoist Sync API v9 uses GET requests with query parameters
    // Format dates for since/until parameters (ISO 8601 format)
    const sinceDate = startOfMonth.toISOString();
    const untilDate = new Date(endOfMonth);
    untilDate.setHours(23, 59, 59, 999); // End of day
    const untilDateISO = untilDate.toISOString();

    // Build query string
    const params = new URLSearchParams({
      object_type: "item",
      event_type: "completed",
      since: sinceDate,
      until: untilDateISO,
      limit: "100", // Maximum is 100 per request
    });

    const response = await fetch(
      `https://api.todoist.com/sync/v9/activity/get?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${todoistToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Todoist API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`Todoist API error: ${response.status} - ${errorText}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      const text = await response.text();
      console.error("Failed to parse Todoist response:", text);
      throw new Error(
        `Invalid JSON response from Todoist: ${text.substring(0, 200)}`
      );
    }

    // Handle different response structures
    const events = data.events || data.items || data || [];

    // Process events and prepare for database insertion
    const completions = [];
    const formatDate = (date, tz = userTimezone) => {
      // Convert UTC date to user's local timezone
      const d = new Date(date);

      // Format the date in the user's timezone
      // Use Intl.DateTimeFormat to get date components in the specified timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const parts = formatter.formatToParts(d);
      const year = parts.find((p) => p.type === "year").value;
      const month = parts.find((p) => p.type === "month").value;
      const day = parts.find((p) => p.type === "day").value;

      return `${year}-${month}-${day}`;
    };

    events.forEach((event) => {
      // Handle different event structures
      const taskId =
        event.object_id || event.item_id || event.id || event.object.id;
      if (!taskId) {
        console.warn("Event missing task ID:", event);
        return;
      }

      // Try multiple date fields - prioritize completion-specific dates
      let eventDate = null;
      if (event.date_completed) eventDate = new Date(event.date_completed);
      else if (event.completed_date) eventDate = new Date(event.completed_date);
      else if (event.event_date) eventDate = new Date(event.event_date);
      else if (event.event_date_utc) eventDate = new Date(event.event_date_utc);
      else if (event.created_at) eventDate = new Date(event.created_at);
      else if (event.date) eventDate = new Date(event.date);

      if (!eventDate || isNaN(eventDate.getTime())) {
        console.warn("Event missing valid date:", event);
        return;
      }

      // Format the completion date (using user's timezone)
      const completionDateStr = formatDate(eventDate, userTimezone);

      // Also create date objects for range comparison (using local timezone)
      const eventDateLocal = new Date(eventDate);
      eventDateLocal.setHours(0, 0, 0, 0);
      const startOfMonthLocal = new Date(startOfMonth);
      startOfMonthLocal.setHours(0, 0, 0, 0);
      const endOfMonthLocal = new Date(endOfMonth);
      endOfMonthLocal.setHours(23, 59, 59, 999);

      // Filter by date range (compare local dates)
      if (
        eventDateLocal >= startOfMonthLocal &&
        eventDateLocal <= endOfMonthLocal
      ) {
        completions.push({
          user_id: userId,
          task_id: String(taskId),
          completion_date: completionDateStr,
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
