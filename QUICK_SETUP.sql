-- =====================================================
-- SUPABASE QUICK SETUP FOR LOVE CHAT
-- =====================================================
-- Copy and paste this SQL into your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/dksanhpjifkwuxniuebm/sql/new
-- =====================================================

-- 1. CREATE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  sender_emoji TEXT,
  content TEXT,
  message_type TEXT DEFAULT 'text',
  file_id TEXT,
  file_url TEXT,
  file_name TEXT,
  reply_to_id UUID,  -- ID of the message being replied to
  reply_to_sender_name TEXT,  -- Name of the person being replied to
  reply_to_content TEXT,  -- Content of the message being replied to
  deleted BOOLEAN DEFAULT false,  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,  -- When message was deleted
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY BUT ALLOW ALL ACCESS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all access to messages"
  ON public.messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

-- 4. ADD COLUMNS IF THEY DON'T EXIST (for existing tables)
DO $$
  ALTER TABLE public.messages 
    ADD COLUMN IF NOT EXISTS reply_to_id UUID,
    ADD COLUMN IF NOT EXISTS reply_to_sender_name TEXT,
    ADD COLUMN IF NOT EXISTS reply_to_content TEXT,
    ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
$$;

-- 5. CREATE STORAGE BUCKET (THIS MUST BE DONE IN STORAGE TAB, NOT SQL)
-- Go to Storage > Create a new bucket > Name: "chat-files" > Check "Public bucket" > Create

-- 6. CREATE STORAGE POLICY FOR PUBLIC ACCESS (RUN AFTER CREATING BUCKET)
-- First, create a policy to allow public access
CREATE POLICY IF NOT EXISTS "Allow public access to chat-files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'chat-files');

CREATE POLICY IF NOT EXISTS "Allow public upload to chat-files"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY IF NOT EXISTS "Allow public update to chat-files"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'chat-files');

-- =====================================================
-- DONE! Your chat should now work! 💕
-- =====================================================
