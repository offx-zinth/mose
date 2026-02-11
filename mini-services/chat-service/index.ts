import { Server } from 'socket.io';

// Define message interface
interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  content: string | null;
  messageType: 'text' | 'image' | 'video' | 'document';
  fileId: string | null;
  createdAt: string;
  seen: boolean;
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
}

// Define message types for Socket.IO events
interface ServerToClientEvents {
  message: (message: ChatMessage) => void;
  message_seen: (messageId: string) => void;
  user_joined: (data: { userId: string; userName: string }) => void;
  user_left: (data: { userId: string; userName: string }) => void;
  online_users: (users: { userId: string; userName: string }[]) => void;
  error: (error: string) => void;
}

interface ClientToServerEvents {
  send_message: (message: Omit<ChatMessage, 'id' | 'createdAt' | 'seen'>) => void;
  mark_seen: (messageId: string) => void;
  join_chat: (data: { userId: string; userName: string }) => void;
}

// Create Socket.IO server
const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store connected users (max 2 users for private chat)
const connectedUsers = new Map<string, UserInfo>(); // socketId -> {userId, userName}
const userIds = new Set<string>();

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

    connectedUsers.set(socket.id, { userId, userName });
    userIds.add(userId);

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
      senderName: userInfo.userName,
      content: messageData.content,
      messageType: messageData.messageType,
      fileId: messageData.fileId,
      createdAt: new Date().toISOString(),
      seen: false,
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

  // Handle disconnection
  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      connectedUsers.delete(socket.id);
      userIds.delete(userInfo.userId);
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

// Start server on port 3003
const PORT = 3003;
io.listen(PORT);
console.log(`🚀 Chat WebSocket service running on port ${PORT}`);
