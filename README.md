# 💕 Our Love Chat

A private, romantic chat app for two people in love, disguised as Wikipedia to keep your conversations private!

---

## ✨ Features

- 🔒 **Secret code authentication** - Only two people can access
- 📚 **Wikipedia-style landing** - Disguises the chat from outsiders
- 💬 **Real-time messaging** - Instant chat via WebSocket
- 📸 **File sharing** - Upload images, videos, documents
- 💾 **Chat history** - All messages saved in Supabase
- 🟢 **Online/offline status** - See when your love is online
- 💕 **Romantic theme** - Beautiful pink/purple design

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
bun install
cd mini-services/chat-service
bun install
cd ../..
```

### 2. Set Up Supabase

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

**Quick version:**
1. Create Supabase project
2. Get URL and anon key
3. Update `src/lib/supabase.ts`
4. Run SQL from `QUICK_SETUP.sql`
5. Create `chat-files` storage bucket

### 3. Start the App

```bash
# Terminal 1: Main app
bun run dev

# Terminal 2: Chat service
cd mini-services/chat-service
bun run dev
```

### 4. Use the Chat

1. Open http://localhost:3000
2. Moshika enters: `020709`
3. Senthil enters: `100608` (in another tab)
4. Chat together! 💕

---

## 🔑 Secret Codes

- **Moshika:** `020709` → Shows "💕 Moshika" in chat
- **Senthil:** `100608` → Shows "❤️ Senthil" in chat
- **Wrong code:** Redirects to Wikipedia (outsiders think it's just Wikipedia!)

---

## ⚙️ Configuration

Edit `src/lib/supabase.ts` to change:

```typescript
// Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_ANON_KEY';

// Users
export const COUPLE_USERS = [
  {
    id: 'love1',
    code: '020709',      // Change this
    name: 'Moshika',    // Change this
    emoji: '💕',
  },
  {
    id: 'love2',
    code: '100608',     // Change this
    name: 'Senthil',    // Change this
    emoji: '❤️',
  },
];

// Redirect URL for wrong codes
export const REDIRECT_URL = 'https://www.wikipedia.org';
```

---

## 📁 Project Structure

```
my-project/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Wikipedia-style landing
│   │   ├── chat/page.tsx          # Romantic chat UI
│   │   └── api/                  # API routes
│   └── lib/supabase.ts           # Config + users
├── mini-services/chat-service/
│   └── index.ts                  # WebSocket server
├── QUICK_SETUP.sql                # SQL for setup
├── SETUP_GUIDE.md                 # Setup instructions
├── PROJECT_SUMMARY.md             # Quick overview
└── README.md                     # This file
```

---

## 📚 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Step-by-step setup
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Quick reference
- **[QUICK_SETUP.sql](./QUICK_SETUP.sql)** - SQL commands

---

## 🔧 Troubleshooting

### Online/Offline Not Working
- Make sure chat service is running (port 3003)
- Refresh both browser windows

### Chat History Not Saving
- Check Supabase credentials in `src/lib/supabase.ts`
- Verify `messages` table exists

### File Upload Fails
- Create `chat-files` storage bucket
- Enable public access policies

---

## 🎯 How It Works

```
Outsider sees Wikipedia → Enters wrong code → Redirected to real Wikipedia
You enter secret code → Opens romantic chat → Chat together!
```

---

## 🎨 Themes

- **Landing page:** Light Wikipedia style (disguise)
- **Chat page:** Pink/purple romantic theme (private)

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui
- **Real-time:** Socket.IO (WebSocket)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage

---

## 💡 Tips

1. Never share secret codes
2. Use incognito browsing
3. Change codes regularly
4. Keep both services running
5. Monitor Supabase usage

---

## 🎉 Enjoy Your Private Chat!

**Built with 💕 for couples who want privacy!**
