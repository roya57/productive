import { supabase } from "./supabase";

// Todoist API helper functions

/**
 * Get all projects for the authenticated user
 * @returns {Promise<Array>} Array of projects
 */
export const getTodoistProjects = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const token = localStorage.getItem(`todoist_token_${user.id}`);
    if (!token) {
      throw new Error(
        "Todoist not connected. Please connect to Todoist first."
      );
    }

    const response = await fetch("https://api.todoist.com/rest/v2/projects", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch projects: ${errorText}`);
    }

    const projects = await response.json();
    return projects;
  } catch (err) {
    console.error("Error fetching Todoist projects:", err);
    throw err;
  }
};

/**
 * Get all labels for the authenticated user
 * @returns {Promise<Array>} Array of labels
 */
export const getTodoistLabels = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const token = localStorage.getItem(`todoist_token_${user.id}`);
    if (!token) {
      throw new Error(
        "Todoist not connected. Please connect to Todoist first."
      );
    }

    const response = await fetch("https://api.todoist.com/rest/v2/labels", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch labels: ${errorText}`);
    }

    const labels = await response.json();
    return labels;
  } catch (err) {
    console.error("Error fetching Todoist labels:", err);
    throw err;
  }
};

/**
 * Get all tasks in a specific project
 * @param {string} projectId - The ID of the project
 * @returns {Promise<Array>} Array of tasks
 */
export const getTodoistTasksByProject = async (projectId) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const token = localStorage.getItem(`todoist_token_${user.id}`);
    if (!token) {
      throw new Error(
        "Todoist not connected. Please connect to Todoist first."
      );
    }

    const response = await fetch(
      `https://api.todoist.com/rest/v2/tasks?project_id=${projectId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tasks: ${errorText}`);
    }

    const tasks = await response.json();
    return tasks;
  } catch (err) {
    console.error("Error fetching Todoist tasks:", err);
    throw err;
  }
};

/**
 * Get all tasks for the authenticated user (across all projects)
 * @returns {Promise<Array>} Array of tasks
 */
export const getAllTodoistTasks = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const token = localStorage.getItem(`todoist_token_${user.id}`);
    if (!token) {
      throw new Error(
        "Todoist not connected. Please connect to Todoist first."
      );
    }

    const response = await fetch("https://api.todoist.com/rest/v2/tasks", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tasks: ${errorText}`);
    }

    const tasks = await response.json();
    return tasks;
  } catch (err) {
    console.error("Error fetching Todoist tasks:", err);
    throw err;
  }
};

/**
 * Get task completion events using Todoist Sync API v9
 * Returns completion events for tasks, grouped by task ID
 * @param {Array<string>} taskIds - Array of task IDs to get completions for
 * @param {Date} startDate - Start date for the date range (optional, defaults to start of current month)
 * @param {Date} endDate - End date for the date range (optional, defaults to end of current month)
 * @returns {Promise<Object>} Object mapping task IDs to arrays of completion dates
 */
export const getTodoistTaskCompletions = async (
  taskIds = [],
  startDate = null,
  endDate = null
) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const token = localStorage.getItem(`todoist_token_${user.id}`);
    if (!token) {
      throw new Error(
        "Todoist not connected. Please connect to Todoist first."
      );
    }

    // Default to current month if no dates provided
    const now = new Date();
    if (!startDate) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (!endDate) {
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      const d = new Date(date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    };

    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // Use Sync API v9 to get activity logs
    // Note: The Sync API uses different parameter names
    const response = await fetch(
      "https://api.todoist.com/sync/v9/activity/get",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object_type: "item",
          event_type: "completed",
          limit: 500, // Maximum allowed
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Todoist API error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `Failed to fetch task completions: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("Failed to parse JSON response:", jsonError);
      const text = await response.text();
      console.error("Response text:", text);
      throw new Error(
        `Invalid JSON response from Todoist API: ${text.substring(0, 200)}`
      );
    }

    // Handle different response structures
    // The Sync API might return events directly or nested in a structure
    let events = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (data.events && Array.isArray(data.events)) {
      events = data.events;
    } else if (data.items && Array.isArray(data.items)) {
      events = data.items;
    }

    // Group completion events by task ID and extract dates
    const completionsByTask = {};

    events.forEach((event) => {
      // Handle different event structures - might be object_id or item_id
      const taskId = event.object_id || event.item_id || event.id;

      // Filter by task IDs if provided, and by date range
      // Convert both to strings for comparison
      if (
        taskIds.length === 0 ||
        (taskId && taskIds.includes(String(taskId)))
      ) {
        // Extract completion date from event
        // Try different possible date fields
        let eventDate = null;
        if (event.event_date) {
          eventDate = new Date(event.event_date);
        } else if (event.date_completed) {
          eventDate = new Date(event.date_completed);
        } else if (event.completed_date) {
          eventDate = new Date(event.completed_date);
        } else if (event.created_at) {
          eventDate = new Date(event.created_at);
        } else if (event.date) {
          eventDate = new Date(event.date);
        }

        if (eventDate && !isNaN(eventDate.getTime())) {
          // Check if event is within date range
          if (eventDate >= startDate && eventDate <= endDate) {
            if (!completionsByTask[taskId]) {
              completionsByTask[taskId] = { dates: [] };
            }

            const completionDate = formatDate(eventDate);
            if (!completionsByTask[taskId].dates.includes(completionDate)) {
              completionsByTask[taskId].dates.push(completionDate);
            }
          }
        }
      }
    });

    return completionsByTask;
  } catch (err) {
    console.error("Error fetching Todoist task completions:", err);

    // Handle CORS errors specifically
    if (err.message && err.message.includes("Access-Control-Allow-Origin")) {
      console.warn(
        "Todoist Sync API cannot be accessed directly from the browser due to CORS restrictions. " +
          "Completion data requires a server-side proxy or backend API."
      );
      // Return empty object instead of throwing - allow the app to continue
      return {};
    }

    throw err;
  }
};
