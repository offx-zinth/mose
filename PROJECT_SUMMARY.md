# 💕 Our Love Chat - Project Summary

A private 2-person chat app with Wikipedia disguise and real-time messaging.

---

## 🎯 What It Is

A romantic chat application for couples with:
- **Wikipedia-style landing** - Hides from prying eyes
- **Secret code access** - Only two people can enter
- **Real-time chat** - Instant messaging via WebSocket
- **File sharing** - Upload photos, videos, documents
- **Chat history** - All messages saved in Supabase
- **Online status** - See when your love is online

---

## 🔑 Quick Access

- **Moshika's code:** `020709`
- **Senthil's code:** `100608`
- **Wrong code:** Redirects to Wikipedia

---

## 🚀 Quick Start

```bash
# Terminal 1: Main app
bun run dev

# Terminal 2: Chat service
cd mini-services/chat-service
bun run dev
```

Then open http://localhost:3000

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase config + user codes |
| `src/app/page.tsx` | Wikipedia-style landing |
| `src/app/chat/page.tsx` | Romantic chat UI |
| `mini-services/chat-service/index.ts` | WebSocket server |

---

## ⚙️ Configuration

Edit `src/lib/supabase.ts` to change:

1. **Supabase credentials** (must do)
2. **User names** (Moshika, Senthil)
3. **Secret codes** (020709, 100608)
4. **Redirect URL** (where outsiders go)

---

## 🗄️ Supabase Setup

See `SETUP_GUIDE.md` for detailed instructions.

**Quick version:**
1. Create Supabase project
2. Get URL and anon key
3. Update `src/lib/supabase.ts`
4. Run SQL from `QUICK_SETUP.sql`
5. Create `chat-files` storage bucket
6. Enable public access

---

## ✅ Features Status

| Feature | Status |
|---------|--------|
| Wikipedia landing | ✅ Working |
| Secret code login | ✅ Working |
| Real-time messaging | ✅ Working |
| Chat history | ✅ Working |
| File upload | ✅ Working |
| Online/offline status | ✅ Working |

---

## 📊 Technology

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui
- **Real-time:** Socket.IO (WebSocket)
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage

---

## 🔧 How It Works

```
User opens site
    ↓
Sees Wikipedia page
    ↓
Enters code
    ├─ Wrong → Redirected to real Wikipedia
    └─ Right → Opens romantic chat
         ↓
    Real-time messaging via WebSocket
         ↓
    Everything saved to Supabase
```

---

## 🎨 Themes

- **Landing:** Light Wikipedia style (for disguise)
- **Chat:** Pink/purple romantic theme (for you two)

---

## 💡 Tips

1. **Never share codes** with anyone else
2. **Use incognito** for extra privacy
3. **Change codes** regularly
4. **Keep both services running**
5. **Monitor Supabase usage**

---

## 📞 Documentation

- **README.md** - Complete documentation
- **SETUP_GUIDE.md** - Quick setup steps
- **QUICK_SETUP.sql** - SQL for Supabase

---

## 🎉 Enjoy!

**Built with 💕 for couples who love privacy!**
