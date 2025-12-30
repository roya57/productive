-- Create habit_reactions table
-- This table stores reactions (emoji) that users give to habits they're tracking
-- Each user can react once per habit per day
-- Creators can view all reactions their habits have received

CREATE TABLE IF NOT EXISTS habit_reactions (
  reaction_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES habits(habit_id) ON DELETE CASCADE,
  reactor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_date DATE NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('clap', 'eyes')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one reaction per user per habit per day
  UNIQUE(habit_id, reactor_id, reaction_date)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_habit_reactions_habit_id ON habit_reactions(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_reactions_reactor_id ON habit_reactions(reactor_id);
CREATE INDEX IF NOT EXISTS idx_habit_reactions_reaction_date ON habit_reactions(reaction_date);
CREATE INDEX IF NOT EXISTS idx_habit_reactions_habit_date ON habit_reactions(habit_id, reaction_date);
CREATE INDEX IF NOT EXISTS idx_habit_reactions_reactor_habit ON habit_reactions(reactor_id, habit_id);

-- Enable Row Level Security
ALTER TABLE habit_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for habit_reactions table

-- Users can view their own reactions
DROP POLICY IF EXISTS "Users can view their own reactions" ON habit_reactions;
CREATE POLICY "Users can view their own reactions" ON habit_reactions
  FOR SELECT USING (auth.uid() = reactor_id);

-- Users can insert their own reactions
DROP POLICY IF EXISTS "Users can insert their own reactions" ON habit_reactions;
CREATE POLICY "Users can insert their own reactions" ON habit_reactions
  FOR INSERT WITH CHECK (auth.uid() = reactor_id);

-- Users can update their own reactions
DROP POLICY IF EXISTS "Users can update their own reactions" ON habit_reactions;
CREATE POLICY "Users can update their own reactions" ON habit_reactions
  FOR UPDATE USING (auth.uid() = reactor_id);

-- Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete their own reactions" ON habit_reactions;
CREATE POLICY "Users can delete their own reactions" ON habit_reactions
  FOR DELETE USING (auth.uid() = reactor_id);

-- Creators can view reactions on their habits
DROP POLICY IF EXISTS "Creators can view reactions on their habits" ON habit_reactions;
CREATE POLICY "Creators can view reactions on their habits" ON habit_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM habits
      WHERE habits.habit_id = habit_reactions.habit_id
      AND habits.habit_data->>'user_id' = auth.uid()::text
    )
  );

-- Grant permissions
GRANT ALL ON habit_reactions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create trigger function for updated_at (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_habit_reactions_updated_at ON habit_reactions;
CREATE TRIGGER update_habit_reactions_updated_at 
    BEFORE UPDATE ON habit_reactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Habit reactions table created successfully!';
    RAISE NOTICE 'Table structure:';
    RAISE NOTICE '  - reaction_id: UUID (Primary Key)';
    RAISE NOTICE '  - habit_id: UUID (Foreign Key to habits)';
    RAISE NOTICE '  - reactor_id: UUID (Foreign Key to auth.users)';
    RAISE NOTICE '  - reaction_date: DATE (Date of reaction)';
    RAISE NOTICE '  - reaction: TEXT (clap or eyes)';
    RAISE NOTICE '  - created_at: TIMESTAMP WITH TIME ZONE';
    RAISE NOTICE '  - updated_at: TIMESTAMP WITH TIME ZONE';
    RAISE NOTICE 'Unique constraint ensures one reaction per user per habit per day.';
    RAISE NOTICE 'RLS policies allow users to manage their own reactions and creators to view reactions on their habits.';
END $$;
