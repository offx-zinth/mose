# 🔧 Supabase Setup Instructions for New Features

This guide shows you what changes to make in Supabase to enable the new features: **Edit Messages** and **Reply to Messages**.

---

## 📋 Changes Needed

You need to add **3 new columns** to your `messages` table:

1. **`reply_to`** - Stores which message this is replying to
2. **`edited_at`** - Tracks when a message was edited
3. **`original_content`** - Stores the original content before edit

---

## 🚀 Quick Setup (2 minutes)

### Option 1: Run the SQL Script (Recommended)

1. Go to your Supabase project
2. Click **SQL Editor** on the left sidebar
3. Click **New query**
4. Copy the entire content of `UPDATE_SUPABASE.sql` file
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. ✅ Done!

### Option 2: Manual Setup (Using Table Editor)

If you prefer doing it manually:

#### Step 1: Add `reply_to` Column
1. Go to **Table Editor**
2. Click on the `messages` table
3. Click **Add column** (usually a + button)
4. Fill in:
   - **Name:** `reply_to`
   - **Type:** `uuid`
   - **Default value:** (leave empty)
   - **Is nullable:** ✅ Check this
   - **Foreign key:**
     - **Reference table:** `messages`
     - **Reference column:** `id`
     - **On delete:** `SET NULL`
5. Click **Save**

#### Step 2: Add `edited_at` Column
1. Click **Add column**
2. Fill in:
   - **Name:** `edited_at`
   - **Type:** `timestamp with time zone`
   - **Default value:** (leave empty)
   - **Is nullable:** ✅ Check this
3. Click **Save**

#### Step 3: Add `original_content` Column
1. Click **Add column**
2. Fill in:
   - **Name:** `original_content`
   - **Type:** `text`
   - **Default value:** (leave empty)
   - **Is nullable:** ✅ Check this
3. Click **Save**

#### Step 4: Create Indexes (Optional but Recommended)
1. Go to **SQL Editor**
2. Run this SQL:
```sql
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_messages_edited_at ON public.messages(edited_at DESC) WHERE edited_at IS NOT NULL;
```

---

## 📝 What These Columns Do

### 1. `reply_to` (uuid, nullable)
- **Purpose:** Links a message to another message it's replying to
- **Example:**
  ```
  Message A: "I love you! 💕"
  Message B: reply_to = Message A.id
           Content: "I love you too! ❤️"
  ```
- **How it works:** When you reply to a message, the reply stores the ID of the original message

### 2. `edited_at` (timestamp, nullable)
- **Purpose:** Stores when a message was last edited
- **Example:**
  ```
  Original: "I love you so much!"
  Edited to: "I love you more than anything!"
  edited_at = "2025-01-15 10:30:00"
  ```
- **How it works:** When you edit a message, this timestamp is set. If it's null, the message was never edited

### 3. `original_content` (text, nullable)
- **Purpose:** Stores the original text before editing
- **Example:**
  ```
  original_content = "I love you so much!"
  content = "I love you more than anything!"
  ```
- **How it works:** First edit stores original, subsequent edits keep the first original

---

## ✅ Verification

After making the changes, verify they're correct:

### Check in SQL Editor:
Run this query:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('reply_to', 'edited_at', 'original_content')
ORDER BY column_name;
```

**Expected output:**
```
column_name       | data_type                   | is_nullable
------------------+-----------------------------+------------
edited_at         | timestamp with time zone    | YES
original_content  | text                        | YES
reply_to          | uuid                        | YES
```

### Check in Table Editor:
1. Go to **Table Editor**
2. Click on `messages` table
3. You should see these columns in the column list:
   - reply_to
   - edited_at
   - original_content

---

## 🎯 After Setup

Once you've made these changes:

1. **Reply to messages:**
   - Click the "Reply" button on any message
   - Type your reply
   - The reply will be linked to the original message
   - Visual indicator shows which message it's replying to

2. **Edit messages:**
   - Click the blue edit icon (pencil) on your own text messages
   - Make changes in the dialog
   - Save
   - Message shows "(edited)" indicator

3. **Long press to delete:**
   - Long press (hold) on your messages for 0.5 seconds
   - Confirm in dialog
   - Message deleted

---

## 🐛 Troubleshooting

### "column does not exist" Error
**Cause:** Columns not created yet
**Solution:** Run the SQL from `UPDATE_SUPABASE.sql`

### "foreign key constraint fails" Error
**Cause:** `reply_to` column doesn't have foreign key properly set
**Solution:**
1. Drop the `reply_to` column
2. Recreate it with the foreign key relationship

### Reply feature not working
**Cause:** `reply_to` column missing or not nullable
**Solution:** Ensure `reply_to` column exists and is nullable

### Edit feature not working
**Cause:** `edited_at` or `original_content` columns missing
**Solution:** Ensure both columns exist

---

## 📊 Updated Schema

Your `messages` table should now have these columns:

```sql
CREATE TABLE public.messages (
  id              UUID      PRIMARY KEY,
  sender_id       TEXT      NOT NULL,
  sender_name     TEXT,
  sender_emoji    TEXT,
  content         TEXT,
  message_type    TEXT      DEFAULT 'text',
  file_id         TEXT,
  file_url        TEXT,
  file_name       TEXT,
  reply_to        UUID,     -- NEW
  edited_at       TIMESTAMP WITH TIME ZONE,  -- NEW
  original_content TEXT,    -- NEW
  seen            BOOLEAN   DEFAULT false,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to);
CREATE INDEX idx_messages_edited_at ON public.messages(edited_at DESC) WHERE edited_at IS NOT NULL;
```

---

## 🎉 All Set!

After running the SQL from `UPDATE_SUPABASE.sql`, your Supabase is ready for all the new features:
- ✅ Reply to messages
- ✅ Edit messages
- ✅ Long press to delete
- ✅ Fixed floating emojis
- ✅ Emoji picker

**Enjoy your enhanced chat! 💕**
