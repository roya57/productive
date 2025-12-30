import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase project URL and anon key
// You can find these in your Supabase dashboard under Settings > API
// For Vite, use import.meta.env instead of process.env
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://uwwsqjdvhtgfyehusbos.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d3NxamR2aHRnZnllaHVzYm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzM5NzEsImV4cCI6MjA3MjAwOTk3MX0.ezv9KEniri08lXsQ1Nxa6pwrHRsxzxDC73PkiGRHCH8";

// Environment variables loaded

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to format date as YYYY-MM-DD (local date, not UTC)
const formatDateKey = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

// Helper function to create a new habit
export const createHabit = async (
  habitData,
  userId = null,
  creatorName = null
) => {
  try {
    // Prepare habit_data JSONB with habit info and user_id
    const habitDataJson = {
      name: habitData.name,
      frequency: habitData.frequency,
      ...(userId && { user_id: userId }),
      ...(creatorName && { creator_name: creatorName }),
    };

    // Insert habit into habits table
    const { data, error } = await supabase
      .from("habits")
      .insert([{ habit_data: habitDataJson }])
      .select();

    if (error) {
      console.error("Error creating habit:", error);
      throw error;
    }

    const createdHabit = data[0];

    // If user is authenticated, add habit to their "created" list in habiters record
    if (userId) {
      try {
        await addHabitToCreated(userId, createdHabit.habit_id);
        console.log("✅ Habit added to user's created list");
      } catch (habiterError) {
        console.error(
          "Warning: Failed to add habit to user's created list:",
          habiterError
        );
        // Don't throw here - habit creation should succeed even if habiter update fails
      }
    }

    return createdHabit;
  } catch (err) {
    console.error("Exception in createHabit:", err);
    throw err;
  }
};

// Helper function to add habit to user's "created" list in habiters table
export const addHabitToCreated = async (userId, habitId) => {
  try {
    // Check if habiter record exists
    const { data: existingHabiter, error: fetchError } = await supabase
      .from("habiters")
      .select("habiter_id, habits")
      .eq("habiter_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error checking habiter record:", fetchError);
      throw fetchError;
    }

    if (existingHabiter) {
      // Habiter exists, initialize habits structure if needed
      const currentHabits = existingHabiter.habits || {};
      const created = currentHabits.created || [];
      const tracked = currentHabits.tracked || [];

      // Add to created if not already there
      if (!created.includes(habitId)) {
        const updatedHabits = {
          created: [...created, habitId],
          tracked: tracked,
        };

        const { data, error } = await supabase
          .from("habiters")
          .update({ habits: updatedHabits })
          .eq("habiter_id", userId)
          .select();

        if (error) {
          console.error("Error updating habiter habits:", error);
          throw error;
        }

        return data[0];
      }
      return existingHabiter;
    } else {
      // Habiter doesn't exist, create new one with habits structure
      const { data, error } = await supabase
        .from("habiters")
        .insert([
          {
            habiter_id: userId,
            habits: {
              created: [habitId],
              tracked: [],
            },
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating habiter record:", error);
        throw error;
      }

      return data;
    }
  } catch (err) {
    console.error("Exception in addHabitToCreated:", err);
    throw err;
  }
};

// Helper function to add habit to user's "tracked" list in habiters table
// This is called when a non-creator clicks "Track This Habit" button
export const addHabitToUser = async (userId, habitId) => {
  try {
    // Check if habiter record exists
    const { data: existingHabiter, error: fetchError } = await supabase
      .from("habiters")
      .select("habiter_id, habits")
      .eq("habiter_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error checking habiter record:", fetchError);
      throw fetchError;
    }

    if (existingHabiter) {
      // Habiter exists, handle both old format (array) and new format (object)
      let currentHabits = existingHabiter.habits;

      // If habits is an array (old format), convert to new format
      if (Array.isArray(currentHabits)) {
        currentHabits = {
          created: [],
          tracked: [...currentHabits],
        };
      }

      // Initialize habits structure if needed
      const habitsData = currentHabits || {};
      const created = habitsData.created || [];
      const tracked = habitsData.tracked || [];

      // Add to tracked if not already there
      // Note: We don't check if it's in created because this function is only
      // called for non-creators, so it shouldn't be in created
      if (!tracked.includes(habitId)) {
        const updatedHabits = {
          created: created,
          tracked: [...tracked, habitId],
        };

        const { data, error } = await supabase
          .from("habiters")
          .update({ habits: updatedHabits })
          .eq("habiter_id", userId)
          .select();

        if (error) {
          console.error("Error updating habiter habits:", error);
          throw error;
        }

        return data[0];
      }
      // If already in tracked, just return existing record
      return existingHabiter;
    } else {
      // Habiter doesn't exist, create new one with habits structure
      const { data, error } = await supabase
        .from("habiters")
        .insert([
          {
            habiter_id: userId,
            habits: {
              created: [],
              tracked: [habitId],
            },
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating habiter record:", error);
        throw error;
      }

      return data;
    }
  } catch (err) {
    console.error("Exception in addHabitToUser:", err);
    throw err;
  }
};

// Helper function to get all habits for a user (both created and tracked)
export const getUserHabits = async (userId) => {
  try {
    // Get user's habit IDs from habiters table
    const { data: habiter, error: habiterError } = await supabase
      .from("habiters")
      .select("habits")
      .eq("habiter_id", userId)
      .single();

    if (habiterError && habiterError.code !== "PGRST116") {
      console.error("Error fetching habiter:", habiterError);
      throw habiterError;
    }

    if (!habiter || !habiter.habits) {
      return [];
    }

    // Get habits from both created and tracked arrays
    const habitsData = habiter.habits;
    const created = habitsData.created || [];
    const tracked = habitsData.tracked || [];

    // Combine both arrays and remove duplicates
    const allHabitIds = [...new Set([...created, ...tracked])];

    if (allHabitIds.length === 0) {
      return [];
    }

    // Get full habit data for each habit ID
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .in("habit_id", allHabitIds);

    if (habitsError) {
      console.error("Error fetching habits:", habitsError);
      throw habitsError;
    }

    return habits || [];
  } catch (err) {
    console.error("Exception in getUserHabits:", err);
    throw err;
  }
};

// Helper function to get created and tracked habits separately
export const getUserHabitsByType = async (userId) => {
  try {
    // Get user's habit IDs from habiters table
    const { data: habiter, error: habiterError } = await supabase
      .from("habiters")
      .select("habits")
      .eq("habiter_id", userId)
      .single();

    if (habiterError && habiterError.code !== "PGRST116") {
      console.error("Error fetching habiter:", habiterError);
      throw habiterError;
    }

    if (!habiter || !habiter.habits) {
      return { created: [], tracked: [] };
    }

    // Handle both old format (array) and new format (object)
    let habitsData = habiter.habits;
    if (Array.isArray(habitsData)) {
      // Old format: convert to new format with all in tracked
      habitsData = {
        created: [],
        tracked: [...habitsData],
      };
    }

    const createdIds = habitsData.created || [];
    const trackedIds = habitsData.tracked || [];

    // Get full habit data for created habits
    let createdHabits = [];
    if (createdIds.length > 0) {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .in("habit_id", createdIds);

      if (error) {
        console.error("Error fetching created habits:", error);
        throw error;
      }
      createdHabits = data || [];
    }

    // Get full habit data for tracked habits
    let trackedHabits = [];
    if (trackedIds.length > 0) {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .in("habit_id", trackedIds);

      if (error) {
        console.error("Error fetching tracked habits:", error);
        throw error;
      }
      trackedHabits = data || [];
    }

    return {
      created: createdHabits,
      tracked: trackedHabits,
    };
  } catch (err) {
    console.error("Exception in getUserHabitsByType:", err);
    throw err;
  }
};

// Helper function to get a single habit by ID
export const getHabit = async (habitId) => {
  try {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("habit_id", habitId)
      .single();

    if (error) {
      console.error("Error fetching habit:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Exception in getHabit:", err);
    throw err;
  }
};

// Helper function to update habit checked days
export const updateHabitCheckedDays = async (habitId, checkedDays) => {
  try {
    // Get current habit data
    const currentHabit = await getHabit(habitId);
    const currentHabitData = currentHabit.habit_data || {};

    // Update habit_data with checked days array
    const updatedHabitData = {
      ...currentHabitData,
      checkedDays: Array.from(checkedDays).sort(), // Convert Set to sorted array
    };

    // Update the habit in database
    const { data, error } = await supabase
      .from("habits")
      .update({ habit_data: updatedHabitData })
      .eq("habit_id", habitId)
      .select();

    if (error) {
      console.error("Error updating habit checked days:", error);
      throw error;
    }

    return data[0];
  } catch (err) {
    console.error("Exception in updateHabitCheckedDays:", err);
    throw err;
  }
};

// Helper function to update habit reading data
export const updateHabitReadingData = async (habitId, readingData) => {
  try {
    // Get current habit data
    const currentHabit = await getHabit(habitId);
    const currentHabitData = currentHabit.habit_data || {};

    // Update habit_data with reading data object
    const updatedHabitData = {
      ...currentHabitData,
      readingData: readingData, // Object with date keys and number values
    };

    // Update the habit in database
    const { data, error } = await supabase
      .from("habits")
      .update({ habit_data: updatedHabitData })
      .eq("habit_id", habitId)
      .select();

    if (error) {
      console.error("Error updating habit reading data:", error);
      throw error;
    }

    return data[0];
  } catch (err) {
    console.error("Exception in updateHabitReadingData:", err);
    throw err;
  }
};

// Helper function to update habit books
export const updateHabitBooks = async (habitId, books) => {
  try {
    // Get current habit data
    const currentHabit = await getHabit(habitId);
    const currentHabitData = currentHabit.habit_data || {};

    // Update habit_data with books array
    const updatedHabitData = {
      ...currentHabitData,
      books: books, // Array of book objects
    };

    // Update the habit in database
    const { data, error } = await supabase
      .from("habits")
      .update({ habit_data: updatedHabitData })
      .eq("habit_id", habitId)
      .select();

    if (error) {
      console.error("Error updating habit books:", error);
      throw error;
    }

    return data[0];
  } catch (err) {
    console.error("Exception in updateHabitBooks:", err);
    throw err;
  }
};

// Helper function to add or update a reaction for a habit on a specific date
// reaction should be 'clap' or 'eyes'
export const upsertHabitReaction = async (habitId, reactionDate, reaction) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to add reactions");
    }

    // Use upsert to insert or update
    const { data, error } = await supabase
      .from("habit_reactions")
      .upsert(
        {
          habit_id: habitId,
          reactor_id: user.id,
          reaction_date: reactionDate, // Format: YYYY-MM-DD
          reaction: reaction, // 'clap' or 'eyes'
        },
        {
          onConflict: "habit_id,reactor_id,reaction_date",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting habit reaction:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Exception in upsertHabitReaction:", err);
    throw err;
  }
};

// Helper function to remove a reaction for a habit on a specific date
export const removeHabitReaction = async (habitId, reactionDate) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to remove reactions");
    }

    const { error } = await supabase
      .from("habit_reactions")
      .delete()
      .eq("habit_id", habitId)
      .eq("reactor_id", user.id)
      .eq("reaction_date", reactionDate);

    if (error) {
      console.error("Error removing habit reaction:", error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error("Exception in removeHabitReaction:", err);
    throw err;
  }
};

// Helper function to get reactions for a habit on a specific date (for creators)
export const getHabitReactionsByDate = async (habitId, reactionDate) => {
  try {
    const { data, error } = await supabase
      .from("habit_reactions")
      .select("reactor_id, reaction, created_at, updated_at")
      .eq("habit_id", habitId)
      .eq("reaction_date", reactionDate);

    if (error) {
      console.error("Error fetching habit reactions by date:", error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getHabitReactionsByDate:", err);
    throw err;
  }
};

// Helper function to get all reactions for a habit (for creators)
export const getAllHabitReactions = async (habitId) => {
  try {
    const { data, error } = await supabase
      .from("habit_reactions")
      .select("reactor_id, reaction_date, reaction, created_at, updated_at")
      .eq("habit_id", habitId)
      .order("reaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching all habit reactions:", error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getAllHabitReactions:", err);
    throw err;
  }
};

// Helper function to get user's reactions for a habit (for trackers)
export const getUserHabitReactions = async (habitId) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { data, error } = await supabase
      .from("habit_reactions")
      .select("reaction_date, reaction, created_at, updated_at")
      .eq("habit_id", habitId)
      .eq("reactor_id", user.id)
      .order("reaction_date", { ascending: false });

    if (error) {
      console.error("Error fetching user habit reactions:", error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error("Exception in getUserHabitReactions:", err);
    throw err;
  }
};

// Helper function to get user's reaction for a habit on a specific date
export const getUserHabitReactionByDate = async (habitId, reactionDate) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const { data, error } = await supabase
      .from("habit_reactions")
      .select("reaction")
      .eq("habit_id", habitId)
      .eq("reactor_id", user.id)
      .eq("reaction_date", reactionDate)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user habit reaction by date:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Exception in getUserHabitReactionByDate:", err);
    throw err;
  }
};
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
