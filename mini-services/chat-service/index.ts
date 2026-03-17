import { createServer } from 'http';
import { Server } from 'socket.io';

// Define message interface
interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderEmoji?: string;
  content: string | null;
  messageType: 'text' | 'image' | 'video' | 'document' | 'voice';
  fileId: string | null;
  fileUrl?: string;
  fileName?: string;
  voiceDuration?: number;
  createdAt: string;
  seen: boolean;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToSender?: string | null;
  replyToEmoji?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  };
}

// User info interface
interface UserInfo {
  userId: string;
  userName: string;
  socketId: string;
}

// Call signal interface for WebRTC
interface CallSignal {
  type: 'call-request' | 'call-accept' | 'call-reject' | 'call-end' | 'signal';
  from: string;
  to?: string;
  callType?: 'voice' | 'video';
  signal?: any;
}

// Define message types for Socket.IO events
interface ServerToClientEvents {
  message: (message: ChatMessage) => void;
  message_seen: (messageId: string) => void;
  message_updated: (message: Partial<ChatMessage> & { id: string }) => void;
  message_deleted: (messageId: string) => void;
  user_joined: (data: { userId: string; userName: string }) => void;
  user_left: (data: { userId: string; userName: string }) => void;
  online_users: (users: { userId: string; userName: string }[]) => void;
  call_signal: (signal: CallSignal) => void;
  error: (error: string) => void;
}

interface ClientToServerEvents {
  send_message: (message: Omit<ChatMessage, 'id' | 'createdAt' | 'seen'>) => void;
  mark_seen: (messageId: string) => void;
  join_chat: (data: { userId: string; userName: string }) => void;
  edit_message: (data: { messageId: string; content: string }) => void;
  delete_message: (messageId: string) => void;
  call_signal: (signal: CallSignal) => void;
}

// Create HTTP server for Render health checks
const httpServer = createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    // Handle other HTTP routes (404)
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Create Socket.IO server attached to HTTP server
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: ["https://wiki-captcha.vercel.app", "http://localhost:3000"],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store connected users (max 2 users for private chat)
const connectedUsers = new Map<string, UserInfo>(); // socketId -> {userId, userName, socketId}
const userIds = new Set<string>();
const userSocketMap = new Map<string, string>(); // userId -> socketId

// Connection limit for 2-person chat
const MAX_USERS = 2;

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Handle user joining the chat
  socket.on('join_chat', (data: { userId: string; userName: string }) => {
    const { userId, userName } = data;

    // Check if chat is already full
    if (userIds.size >= MAX_USERS && !userIds.has(userId)) {
      socket.emit('error', 'Chat room is full (max 2 users)');
      socket.disconnect();
      return;
    }

    // If user already connected with different socket, disconnect old one
    const existingSocketId = userSocketMap.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      io.to(existingSocketId).emit('error', 'Connected from another location');
      connectedUsers.delete(existingSocketId);
    }

    connectedUsers.set(socket.id, { userId, userName, socketId: socket.id });
    userIds.add(userId);
    userSocketMap.set(userId, socket.id);

    console.log(`User ${userName} (${userId}) joined chat (${userIds.size}/${MAX_USERS} users)`);

    // Send current online users to the newly joined user
    const onlineUsersList: { userId: string; userName: string }[] = [];
    connectedUsers.forEach((userInfo) => {
      onlineUsersList.push({ userId: userInfo.userId, userName: userInfo.userName });
    });
    socket.emit('online_users', onlineUsersList);

    // Notify ALL users (including the new user) that someone joined
    io.emit('user_joined', { userId, userName });
  });

  // Handle sending messages
  socket.on('send_message', async (messageData) => {
    const userInfo = connectedUsers.get(socket.id);

    if (!userInfo) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    // Create full message with metadata
    const message: ChatMessage = {
      id: generateId(),
      senderId: userInfo.userId,
      senderName: messageData.senderName || userInfo.userName,
      senderEmoji: messageData.senderEmoji,
      content: messageData.content,
      messageType: messageData.messageType,
      fileId: messageData.fileId,
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      voiceDuration: messageData.voiceDuration,
      createdAt: new Date().toISOString(),
      seen: false,
      replyToId: messageData.replyToId,
      replyToContent: messageData.replyToContent,
      replyToSender: messageData.replyToSender,
      replyToEmoji: messageData.replyToEmoji,
      file: messageData.file,
    };

    console.log(`Message from ${userInfo.userName}: ${message.content || '(file message)'}`);

    // Broadcast message to all connected clients (including sender for consistency)
    io.emit('message', message);
  });

  // Handle marking messages as seen
  socket.on('mark_seen', (messageId) => {
    console.log(`Message ${messageId} marked as seen`);
    // Broadcast to all clients
    io.emit('message_seen', messageId);
  });

  // Handle message edits
  socket.on('edit_message', (data) => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) return;

    console.log(`Message ${data.messageId} edited by ${userInfo.userName}`);
    io.emit('message_updated', {
      id: data.messageId,
      content: data.content,
      isEdited: true,
      editedAt: new Date().toISOString(),
    });
  });

  // Handle message deletion
  socket.on('delete_message', (messageId) => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) return;

    console.log(`Message ${messageId} deleted by ${userInfo.userName}`);
    io.emit('message_deleted', messageId);
  });

  // Handle WebRTC Call signaling
  socket.on('call_signal', (signal: CallSignal) => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) {
      console.log('Call signal: User not found');
      return;
    }

    console.log(`Call signal ${signal.type} from ${userInfo.userName} (${userInfo.userId})`);

    // Forward signal to target user
    if (signal.to) {
      const targetSocketId = userSocketMap.get(signal.to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('call_signal', {
          ...signal,
          from: userInfo.userId,
        });
        console.log(`Call signal ${signal.type} forwarded to ${signal.to}`);
      } else {
        console.log(`Target user ${signal.to} not found for call signal`);
        // Notify caller that target is not available
        socket.emit('call_signal', {
          type: 'call-reject',
          from: signal.to,
        });
      }
    } else {
      // Broadcast to all other users (for call requests without specific target)
      socket.broadcast.emit('call_signal', {
        ...signal,
        from: userInfo.userId,
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      connectedUsers.delete(socket.id);
      userIds.delete(userInfo.userId);
      userSocketMap.delete(userInfo.userId);
      console.log(`User ${userInfo.userName} (${userInfo.userId}) left chat (${userIds.size}/${MAX_USERS} users)`);
      io.emit('user_left', { userId: userInfo.userId, userName: userInfo.userName });
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Start server with environment port support for Render
const PORT = process.env.PORT || 3003;
httpServer.listen(PORT, () => {
  console.log(`🚀 Chat WebSocket service running on port ${PORT}`);
  console.log(`🔍 Health check available at http://localhost:${PORT}/health`);
});
