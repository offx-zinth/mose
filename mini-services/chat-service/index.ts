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
  reactions?: Reaction[];
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    storagePath: string;
  };
}

// Reaction interface
interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

// User info interface
interface UserInfo {
  userId: string;
  userName: string;
  socketId: string;
}

// Call signaling interface
interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-start' | 'call-answer' | 'call-decline' | 'call-end' | 'screen-share-start' | 'screen-share-stop';
  from: string;
  to: string;
  callType?: 'voice' | 'video' | 'screen';
  data?: any;
}

// Watch together interface
interface WatchTogetherSignal {
  type: 'play' | 'pause' | 'seek' | 'sync' | 'join' | 'leave' | 'url-change';
  from: string;
  data: {
    currentTime?: number;
    videoUrl?: string;
    isPlaying?: boolean;
  };
}

// Define message types for Socket.IO events
interface ServerToClientEvents {
  message: (message: ChatMessage) => void;
  message_seen: (messageId: string) => void;
  message_updated: (message: Partial<ChatMessage> & { id: string }) => void;
  message_deleted: (messageId: string) => void;
  message_reaction: (data: { messageId: string; reactions: Reaction[] }) => void;
  user_joined: (data: { userId: string; userName: string }) => void;
  user_left: (data: { userId: string; userName: string }) => void;
  online_users: (users: { userId: string; userName: string }[]) => void;
  call_signal: (signal: CallSignal) => void;
  watch_together: (signal: WatchTogetherSignal) => void;
  error: (error: string) => void;
}

interface ClientToServerEvents {
  send_message: (message: Omit<ChatMessage, 'id' | 'createdAt' | 'seen'>) => void;
  mark_seen: (messageId: string) => void;
  join_chat: (data: { userId: string; userName: string }) => void;
  edit_message: (data: { messageId: string; content: string }) => void;
  delete_message: (messageId: string) => void;
  react_message: (data: { messageId: string; emoji: string; userId: string }) => void;
  call_signal: (signal: CallSignal) => void;
  watch_together: (signal: WatchTogetherSignal) => void;
}

// Create Socket.IO server
const io = new Server<ClientToServerEvents, ServerToClientEvents>({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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
      file: messageData.file,
      reactions: [],
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

  // Handle message reactions
  socket.on('react_message', (data) => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) return;

    console.log(`Reaction ${data.emoji} on message ${data.messageId} by ${userInfo.userName}`);
    // Broadcast reaction update to all clients
    // Note: The actual reaction list will be managed by the database
    io.emit('message_reaction', {
      messageId: data.messageId,
      reactions: [], // This will be populated from the database
    });
  });

  // Handle call signaling (WebRTC)
  socket.on('call_signal', (signal) => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) return;

    console.log(`Call signal ${signal.type} from ${userInfo.userName}`);

    // Forward the signal to the target user
    const targetSocketId = userSocketMap.get(signal.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_signal', {
        ...signal,
        from: userInfo.userId,
      });
    }
  });

  // Handle watch together signaling
  socket.on('watch_together', (signal) => {
    const userInfo = connectedUsers.get(socket.id);
    if (!userInfo) return;

    console.log(`Watch together ${signal.type} from ${userInfo.userName}`);

    // Broadcast to all other users
    socket.broadcast.emit('watch_together', {
      ...signal,
      from: userInfo.userId,
    });
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

// Start server on port 3003
const PORT = 3003;
io.listen(PORT);
console.log(`🚀 Chat WebSocket service running on port ${PORT}`);
