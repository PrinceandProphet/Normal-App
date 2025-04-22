-- Add new columns to tasks table if they don't exist
DO $$
BEGIN
    -- Check if columns exist and add them if they don't
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tasks' AND column_name = 'created_by_id') THEN
        ALTER TABLE tasks ADD COLUMN created_by_id INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tasks' AND column_name = 'created_by_type') THEN
        ALTER TABLE tasks ADD COLUMN created_by_type TEXT NOT NULL DEFAULT 'practitioner';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tasks' AND column_name = 'assigned_to_id') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to_id INTEGER NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tasks' AND column_name = 'assigned_to_type') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to_type TEXT NULL;
    END IF;
    
    RAISE NOTICE 'Task table updated successfully!';
END $$;