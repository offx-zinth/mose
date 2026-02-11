# 🔧 Supabase Database Migration Guide

To enable the **Edit Message** and **Reply to Message** features, you need to add new columns to your `messages` table.

---

## 📋 Required Changes

### Add New Columns to Messages Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Add reply_to column (for replying to messages)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add edited_at column (to track when message was edited)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

-- Add is_edited column (to flag edited messages)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

-- Create index for reply_to for better performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);
```

---

## 📊 Updated Messages Table Schema

After running the SQL, your `messages` table will look like this:

| Column Name | Type | Default | Description |
|-------------|------|---------|-------------|
| id | UUID | gen_random_uuid() | Primary key |
| sender_id | TEXT | - | User ID (love1 or love2) |
| sender_name | TEXT | - | User name |
| sender_emoji | TEXT | - | User emoji (💕 or ❤️) |
| content | TEXT | - | Message text |
| message_type | TEXT | 'text' | Type: text, image, video, document |
| file_id | TEXT | - | File identifier |
| file_url | TEXT | - | Supabase storage URL |
| file_name | TEXT | - | Original file name |
| reply_to_id | UUID | NULL | **NEW** - ID of message being replied to |
| seen | BOOLEAN | false | Message read status |
| created_at | TIMESTAMP | now() | Timestamp |
| edited_at | TIMESTAMP | NULL | **NEW** - When message was last edited |
| is_edited | BOOLEAN | false | **NEW** - Whether message has been edited |

---

## 🔄 What Each New Column Does

### 1. `reply_to_id` (UUID, nullable)
- **Purpose:** Links a message to the message it's replying to
- **Usage:** When you reply to a message, this stores the parent message ID
- **NULL if:** Message is not a reply

### 2. `edited_at` (TIMESTAMP, nullable)
- **Purpose:** Records when a message was last edited
- **Usage:** Shows "Edited at [time]" below the message
- **NULL if:** Message has never been edited

### 3. `is_edited` (BOOLEAN, default: false)
- **Purpose:** Quick flag to check if message has been edited
- **Usage:** Shows "✏️ Edited" indicator next to message
- **Stays false:** If message has never been edited

---

## ✅ How to Apply Changes

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Click **SQL Editor** on the left sidebar
3. Click **New query**
4. Copy and paste the SQL from above
5. Click **Run** button
6. Wait for "Success" message
7. You're done! ✅

### Option B: Using Supabase CLI (Advanced)

If you're using Supabase CLI locally:

```bash
# Create a new migration
supabase migration new add_edit_and_reply_features

# Edit the migration file with the SQL above
# Then apply it
supabase db push
```

---

## 🧪 Verify Changes

After running the SQL, verify the columns were added:

1. Go to **Table Editor** in Supabase
2. Click on the `messages` table
3. You should see these new columns:
   - ✅ `reply_to_id`
   - ✅ `edited_at`
   - ✅ `is_edited`

---

## 📝 Example Data After Changes

| id | sender_id | content | reply_to_id | is_edited | edited_at |
|----|-----------|---------|-------------|-----------|-----------|
| uuid1 | love1 | I love you! | NULL | false | NULL |
| uuid2 | love2 | I love you too! | uuid1 | false | NULL |
| uuid3 | love1 | Love you forever! 💕 | uuid2 | true | 2025-01-15 10:30:00 |

**Explanation:**
- `uuid1` is the original message
- `uuid2` is a **reply** to `uuid1`
- `uuid3` is a **reply** to `uuid2` and has been **edited**

---

## ⚠️ Important Notes

### Backward Compatibility
- All new columns are **nullable** and have **default values**
- Existing messages will work fine with NULL values
- No need to delete or modify existing data

### Performance
- The `reply_to_id` index improves query performance for threaded conversations
- If you have thousands of messages, this will help

### Data Integrity
- `reply_to_id` has `ON DELETE SET NULL`
- If a parent message is deleted, replies will show `reply_to_id = NULL`
- This prevents broken references

---

## 🎉 After Migration

Once you apply these changes:

1. **Edit Message** feature will work
2. **Reply to Message** feature will work
3. Messages will show "✏️ Edited" indicator
4. Replies will show the original message being replied to
5. All existing features will continue to work

---

## 🚨 If You Get Errors

### Error: "column already exists"
- **Solution:** This is okay! The column is already there. The SQL uses `IF NOT EXISTS` to handle this.

### Error: "relation does not exist"
- **Solution:** Make sure you've created the `messages` table first (see QUICK_SETUP.sql)

### Error: "permission denied"
- **Solution:** Make sure you're using a Supabase account with table edit permissions

---

## 💡 Next Steps

After applying the database changes:

1. **Refresh your chat page**
2. **Try the new features:**
   - Long-press on a message to edit/delete
   - Click reply button on a message
   - See the reply preview
3. **Test editing messages**
4. **Test replying to messages**

---

## 📞 Need Help?

If you encounter issues:

1. Check that all three columns were added
2. Verify the index was created
3. Check browser console for errors
4. Check dev server logs for API errors

---

**🎉 Your database is now ready for the new features!**
