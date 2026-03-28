import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://mvprnkoufuoelqlzsgaq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cHJua291ZnVvZWxxbHpzZ2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjQ2NDEsImV4cCI6MjA4OTUwMDY0MX0.Jp4zh372rWUyB99De6qk_4B1niWyHBwmFKDuWlw7v4c';

// Singleton pattern to prevent connection exhaustion in serverless environments
const globalForSupabase = globalThis as unknown as {
  supabase: ReturnType<typeof createClient> | undefined;
};

export const supabase =
  globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseAnonKey);

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase;

// Hardcoded users for the couple
export const COUPLE_USERS = [
  {
    id: 'love1',
    code: '020709',
    name: 'Moshika',
    emoji: '💕',
  },
  {
    id: 'love2',
    code: '100608',
    name: 'Senthil',
    emoji: '❤️',
  },
];

// Redirect URL for fake CAPTCHA
export const REDIRECT_URL = 'https://www.wikipedia.org';
