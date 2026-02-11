import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://dksanhpjifkwuxniuebm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrc2FuaHBqaWZrd3V4bml1ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NDE3MTUsImV4cCI6MjA4NjExNzcxNX0.YyELJQReZomxq14hmTxzoWuqgW_E60X3u4m2RXT5Zl0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
