'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, FileText, Upload, LogOut, MoreVertical, Heart, Sparkles, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserInfo {
  id: string;
  name: string;
  emoji: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderEmoji?: string;
  content: string | null;
  messageType: 'text' | 'image' | 'video' | 'document';
  fileId: string | null;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  seen: boolean;
}

interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [setupStatus, setSetupStatus] = useState<{isSetupComplete: boolean; messagesTable: boolean; storageBucket: boolean} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const WEBSOCKET_PORT = 3003;

  useEffect(() => {
    const userStr = localStorage.getItem('chat-user');
    if (!userStr) {
      router.push('/');
      return;
    }

    try {
      const userData: UserInfo = JSON.parse(userStr);
      setUser(userData);
    } catch (err) {
      console.error('Failed to parse user data:', err);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const socketInstance = io(`/?XTransformPort=${WEBSOCKET_PORT}`, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to chat server');

      // Join chat
      socketInstance.emit('join_chat', {
        userId: user.id,
        userName: user.name,
      });

      // Add self to online users immediately
      setOnlineUsers(new Set([user.id]));
    });

    socketInstance.on('message', (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socketInstance.on('message_seen', (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, seen: true } : m))
      );
    });

    // Receive initial list of online users
    socketInstance.on('online_users', (users: { userId: string; userName: string }[]) => {
      const userIdSet = new Set(users.map(u => u.userId));
      console.log('Online users:', users);
      setOnlineUsers(userIdSet);
    });

    socketInstance.on('user_joined', (data: { userId: string; userName: string }) => {
      console.log(`User ${data.userName} joined`);
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    });

    socketInstance.on('user_left', (data: { userId: string; userName: string }) => {
      console.log(`User ${data.userName} left`);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    socketInstance.on('error', (error: string) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, WEBSOCKET_PORT]);

  // Check setup status
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await fetch('/api/setup');
        const data = await response.json();
        setSetupStatus(data);
      } catch (err) {
        console.error('Failed to check setup:', err);
      }
    };
    checkSetup();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages?limit=50');
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (socket && messages.length > 0 && user) {
      const unseenMessages = messages.filter((m) => m.senderId !== user.id && !m.seen);
      unseenMessages.forEach((m) => {
        socket.emit('mark_seen', m.id);
      });
    }
  }, [messages, socket, user]);

  const handleSendMessage = async () => {
    if (!input.trim() || sending || !socket || !user) return;

    setSending(true);
    const messageContent = input.trim();
    setInput('');

    try {
      socket.emit('send_message', {
        senderId: user.id,
        senderName: user.name,
        content: messageContent,
        messageType: 'text' as const,
        fileId: null,
      });

      await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.name,
          senderEmoji: user.emoji,
          content: messageContent,
          messageType: 'text',
        }),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setInput(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (uploading || !user) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.file) {
        const fileMetadata: FileMetadata = data.file;
        let messageType: 'image' | 'video' | 'document' = 'document';

        if (fileMetadata.mimeType.startsWith('image/')) {
          messageType = 'image';
        } else if (fileMetadata.mimeType.startsWith('video/')) {
          messageType = 'video';
        }

        if (socket) {
          socket.emit('send_message', {
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            content: null,
            messageType,
            fileId: fileMetadata.id,
            fileUrl: fileMetadata.storagePath,
            fileName: fileMetadata.originalName,
          });
        }

        await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            content: null,
            messageType,
            fileId: fileMetadata.id,
            fileUrl: fileMetadata.storagePath,
            fileName: fileMetadata.originalName,
          }),
        });
      } else {
        alert(data.error || 'Failed to upload file, my love!');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file, darling!');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat-user');
    router.push('/');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMessageContent = (message: Message) => {
    if (message.messageType === 'text') {
      return (
        <p className="break-words whitespace-pre-wrap">{message.content}</p>
      );
    }

    if (message.messageType === 'image' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <img
            src={message.fileUrl}
            alt={message.fileName}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.fileUrl, '_blank')}
          />
        </div>
      );
    }

    if (message.messageType === 'video' && message.fileUrl) {
      return (
        <div className="space-y-2">
          <video
            src={message.fileUrl}
            controls
            className="max-w-full rounded-lg"
          />
        </div>
      );
    }

    if (message.messageType === 'document' && message.fileName) {
      return (
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-pink-900/30">
          <FileText className="w-8 h-8 flex-shrink-0 text-pink-500" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-pink-100">{message.fileName}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-pink-700/50 hover:bg-pink-900/30 text-pink-300"
            onClick={() => window.open(message.fileUrl, '_blank')}
          >
            Download
          </Button>
        </div>
      );
    }

    return null;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-pink-300">Loading our chat... 💕</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-pink-900/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Our Chat 💕
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-pink-300/70">
                  {onlineUsers.size > 1 ? '🟢 Online together' : user && onlineUsers.has(user.id) ? '🟢 Online' : '💤 Offline'}
                </span>
                <span className="text-pink-700">•</span>
                <span className="text-sm text-pink-400 font-medium">
                  {user?.emoji} {user?.name}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-pink-300 hover:text-pink-100">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-pink-900/50">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Setup Warning */}
          {setupStatus && !setupStatus.isSetupComplete && (
            <div className="p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
              <h3 className="text-yellow-300 font-semibold mb-2">⚠️ Setup Required</h3>
              <p className="text-yellow-200/80 text-sm mb-3">
                Some Supabase resources need to be created for the chat to work properly:
              </p>
              <ul className="text-sm space-y-1 text-yellow-200/70">
                {!setupStatus.messagesTable && (
                  <li>• <strong>Messages table</strong> - Create in Supabase Table Editor</li>
                )}
                {!setupStatus.storageBucket && (
                  <li>• <strong>Storage bucket</strong> - Create 'chat-files' bucket in Supabase Storage</li>
                )}
              </ul>
              <p className="text-xs text-yellow-300/60 mt-3">
                See SUPABASE_SETUP.md for detailed instructions.
              </p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center animate-pulse">
                  <Heart className="w-12 h-12 text-pink-400 fill-pink-400/30" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-pink-300 font-medium text-lg">No messages yet, my love 💕</p>
              <p className="text-sm text-pink-400/60 mt-2">
                Start the conversation with something sweet!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user.id;
              const displayName = message.senderName || (isOwn ? user.name : 'My Love');
              const emoji = message.senderEmoji || (isOwn ? user.emoji : '💕');

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[70%] space-y-1 ${
                      isOwn ? 'items-end' : 'items-start'
                    } flex flex-col`}
                  >
                    {!isOwn && message.senderName && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-sm">{emoji}</span>
                        <span className="text-xs text-pink-400 font-medium">
                          {message.senderName}
                        </span>
                      </div>
                    )}

                    <Card
                      className={`p-4 ${
                        isOwn
                          ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white border-0 shadow-lg shadow-pink-900/20'
                          : 'bg-slate-800/80 border-pink-900/30 backdrop-blur-sm'
                      }`}
                    >
                      {renderMessageContent(message)}
                    </Card>

                    <div className="flex items-center gap-2 px-1">
                      <span className="text-xs text-pink-400/50">
                        {formatTime(message.createdAt)}
                      </span>
                      {isOwn && message.seen && (
                        <span className="text-xs text-pink-400/50">
                          Seen 💕
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="sticky bottom-0 bg-slate-900/80 backdrop-blur-sm border-t border-pink-900/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="border-pink-700/50 hover:bg-pink-900/30 text-pink-300"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Say something sweet, my love... 💕"
              className="flex-1 bg-slate-800/50 border-pink-700/50 text-pink-100 placeholder:text-pink-600 focus-visible:ring-pink-500"
              disabled={sending || uploading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || sending || uploading}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
