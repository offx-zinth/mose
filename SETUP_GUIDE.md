# 🚀 Quick Setup Guide

Get your love chat running in 5 minutes!

---

## 📋 Prerequisites

✅ Node.js / Bun installed  
✅ Supabase account (free tier works)  
✅ Two devices or browser windows

---

## ⚡ Step-by-Step Setup

### Step 1: Install Dependencies (1 minute)

```bash
# Main app
cd /home/z/my-project
bun install

# Chat service
cd mini-services/chat-service
bun install
cd ../..
```

### Step 2: Set Up Supabase (3 minutes)

#### A. Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Enter name and password
4. Wait 1-2 minutes

#### B. Get Credentials
1. Click **Settings** → **API**
2. Copy **Project URL** and **anon key**

#### C. Update Code
Edit `src/lib/supabase.ts`:
```typescript
const supabaseUrl = 'YOUR_PROJECT_URL';
const supabaseAnonKey = 'YOUR_ANON_KEY';
```

#### D. Create Messages Table
1. Go to **SQL Editor**
2. Copy and paste this SQL:

```sql
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
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all access to messages"
  ON public.messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
```

3. Click **Run**

#### E. Create Storage Bucket
1. Go to **Storage**
2. Click **Create a new bucket**
3. Name: `chat-files`
4. ✅ Check **Public bucket**
5. Click **Create bucket**
6. Click bucket → **Policies** → **New Policy**
7. Select **Allow public access** → **Save**

### Step 3: Start the App (1 minute)

**Terminal 1 - Main App:**
```bash
bun run dev
```

**Terminal 2 - Chat Service:**
```bash
cd mini-services/chat-service
bun run dev
```

### Step 4: Test It! (30 seconds)

1. Open http://localhost:3000
2. Moshika enters: `020709`
3. Open new tab/incognito window
4. Senthil enters: `100608`
5. Chat together! 💕

---

## ✅ Verification Checklist

- [ ] Both services running (no errors in terminals)
- [ ] Can access Wikipedia-style landing page
- [ ] Secret codes work (020709, 100608)
- [ ] Chat page opens with romantic theme
- [ ] Messages send in real-time
- [ **]** Online/offline status shows correctly
- [ ] Chat history persists after refresh
- [ ] File upload works (image or document)

---

## 🔧 Common Issues

### "Setup Required" Warning
**Solution:** Complete Step 2 (Supabase setup)

### Messages Don't Save
**Solution:** Check Supabase credentials and run the SQL

### File Upload Fails
**Solution:** Create `chat-files` bucket and enable public access

### Online/Offline Not Working
**Solution:** Make sure both terminals are running and refresh both browser windows

---

## 🎉 You're All Set!

**Enjoy your private romantic chat! 💕❤️**

For detailed documentation, see [README.md](./README.md)
