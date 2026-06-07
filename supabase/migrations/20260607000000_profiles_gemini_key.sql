-- Add gemini_key to profiles and enable RLS
-- Users store their own Gemini API key; RLS ensures only the owner can read/write it.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_key TEXT;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own profile row on first sign-in
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
