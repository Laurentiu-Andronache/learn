-- Ensure target user has a profile row (upsert, no-op if exists)
INSERT INTO profiles (id) VALUES ('5f4bd4c6-6540-4a7c-a176-cebeb67cfb35')
ON CONFLICT (id) DO NOTHING;

-- Add creator_id column referencing profiles
ALTER TABLE themes ADD COLUMN creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Set all existing topics to the specified creator
UPDATE themes SET creator_id = '5f4bd4c6-6540-4a7c-a176-cebeb67cfb35';

-- Drop the old is_builtin column
ALTER TABLE themes DROP COLUMN is_builtin;
