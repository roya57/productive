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

// Helper function to create a new habit
export const createHabit = async (habitData, userId = null) => {
  try {
    // Prepare habit_data JSONB with habit info and user_id
    const habitDataJson = {
      name: habitData.name,
      frequency: habitData.frequency,
      ...(userId && { user_id: userId }),
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

    // If user is authenticated, add habit to their habiters record
    if (userId) {
      try {
        await addHabitToUser(userId, createdHabit.habit_id);
        console.log("✅ Habit added to user's habit list");
      } catch (habiterError) {
        console.error(
          "Warning: Failed to add habit to user's list:",
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

// Helper function to add habit to user's habit list in habiters table
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
      // Habiter exists, add habit to their list if not already there
      const currentHabits = existingHabiter.habits || [];
      if (!currentHabits.includes(habitId)) {
        const updatedHabits = [...currentHabits, habitId];

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
      // Habiter doesn't exist, create new one
      const { data, error } = await supabase
        .from("habiters")
        .insert([
          {
            habiter_id: userId,
            habits: [habitId],
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

// Helper function to get all habits for a user
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

    if (!habiter || !habiter.habits || habiter.habits.length === 0) {
      return [];
    }

    // Get full habit data for each habit ID
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .in("habit_id", habiter.habits);

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
