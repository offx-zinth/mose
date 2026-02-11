-- Supabase Migration for Reply and Edit Features
-- Run this in Supabase SQL Editor

-- Add reply_to column to track which message this is replying to
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add edited_at column to track when message was edited
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add original_content column to store content before edit
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS original_content TEXT;

-- Create index on reply_to for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to);

-- Create index on edited_at for filtering edited messages
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at DESC) WHERE edited_at IS NOT NULL;

-- Enable RLS policy for new columns (if RLS is enabled)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Update policy to allow all access (for simplicity)
CREATE POLICY IF NOT EXISTS "Allow all access to messages"
  ON public.messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
