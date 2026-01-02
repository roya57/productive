-- Create todoist_completions table
-- This table stores task completion data fetched from Todoist API
-- Data is fetched server-side and stored here to avoid CORS issues

CREATE TABLE IF NOT EXISTS todoist_completions (
  completion_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL, -- Todoist task ID (string)
  completion_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one completion record per user, task, and date
  UNIQUE(user_id, task_id, completion_date)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_todoist_completions_user_id ON todoist_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_todoist_completions_task_id ON todoist_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_todoist_completions_date ON todoist_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_todoist_completions_user_task ON todoist_completions(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_todoist_completions_user_date ON todoist_completions(user_id, completion_date);

-- Enable Row Level Security
ALTER TABLE todoist_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for todoist_completions table

-- Users can view their own completions
DROP POLICY IF EXISTS "Users can view their own todoist completions" ON todoist_completions;
CREATE POLICY "Users can view their own todoist completions" ON todoist_completions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update completions (for background jobs)
-- Note: This would be done via service role key, not through RLS

-- Grant permissions
GRANT ALL ON todoist_completions TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Todoist completions table created successfully!';
    RAISE NOTICE 'Table structure:';
    RAISE NOTICE '  - completion_id: UUID (Primary Key)';
    RAISE NOTICE '  - user_id: UUID (Foreign Key to auth.users)';
    RAISE NOTICE '  - task_id: TEXT (Todoist task ID)';
    RAISE NOTICE '  - completion_date: DATE (Date when task was completed)';
    RAISE NOTICE '  - created_at: TIMESTAMP WITH TIME ZONE';
    RAISE NOTICE 'Unique constraint ensures one completion record per user, task, and date.';
END $$;

