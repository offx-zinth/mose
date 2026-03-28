'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Send, FileText, Upload, LogOut, MoreVertical, Heart,
  Trash2, Smile, Edit2, Reply, Phone, Video, PhoneOff,
  Mic, MicOff, VideoOff, Monitor, Minimize2, Maximize2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  messageType: 'text' | 'image' | 'video' | 'document' | 'voice';
  fileId: string | null;
  fileUrl?: string;
  fileName?: string;
  createdAt: string;
  seen: boolean;
  replyToId?: string | null;
  replyToContent?: string | null;
  replyToSender?: string | null;
  replyToEmoji?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  voiceDuration?: number;
}

interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

interface CallSignal {
  type: 'call-request' | 'call-accept' | 'call-reject' | 'call-end' | 'signal';
  from: string;
  to?: string;
  callType?: 'voice' | 'video';
  signal?: any;
}

const FLOATING_EMOJIS = ['💗', '🎀', '✨', '🌸', '🌷', '🫧'];

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: '😊',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  },
  {
    name: 'Love',
    icon: '❤️',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❤️‍🔥', '❤️‍🩹'],
  },
  {
    name: 'People',
    icon: '👋',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🙏'],
  },
];

const WEBSOCKET_PORT = 3003;
const INACTIVITY_TIMEOUT = 60 * 1000;
const LONG_PRESS_DURATION = 500;

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
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteDialogOpenOwn, setDeleteDialogOpenOwn] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{emoji: string; left: string; top: string}>>([]);

  // Action menu state
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Call state
  const [callState, setCallState] = useState<{
    type: 'voice' | 'video' | null;
    status: 'idle' | 'calling' | 'ringing' | 'connected';
    otherUserId: string | null;
    otherUserName: string | null;
    isMinimized: boolean;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
  }>({ 
    type: null, 
    status: 'idle', 
    otherUserId: null, 
    otherUserName: null,
    isMinimized: false,
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Use refs for things that need to be accessed in callbacks without stale closure issues
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const userRef = useRef<UserInfo | null>(null);
  const callStateRef = useRef(callState);
  const signalBufferRef = useRef<any[]>([]); // Buffer for signals received before peer is ready

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { remoteStreamRef.current = remoteStream; }, [remoteStream]);

  // Inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setInactivityWarning(false);
    setTimeLeft(60);

    inactivityTimerRef.current = setTimeout(() => {
      setInactivityWarning(true);
      const countdown = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            window.location.href = 'https://www.wikipedia.org';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - 10000);
  }, []);

  useEffect(() => {
    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    resetInactivityTimer();
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Generate floating emojis
  useEffect(() => {
    const emojis = [...Array(25)].map((_, i) => ({
      emoji: FLOATING_EMOJIS[i % FLOATING_EMOJIS.length],
      left: `${Math.random() * 95}%`,
      top: `${Math.random() * 95}%`,
    }));
    setFloatingEmojis(emojis);
  }, []);

  // Load user
  useEffect(() => {
    const userStr = localStorage.getItem('chat-user');
    if (!userStr) {
      router.push('/');
      return;
    }
    try {
      const userData: UserInfo = JSON.parse(userStr);
      setUser(userData);
    } catch {
      router.push('/');
    }
  }, [router]);

  // End call function - defined before socket connection
  const endCall = useCallback(() => {
    console.log('Ending call...');
    
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    remoteStreamRef.current?.getTracks().forEach(t => t.stop());
    
    // Destroy peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    // Clear signal buffer
    signalBufferRef.current = [];
    
    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setCallState({ 
      type: null, 
      status: 'idle', 
      otherUserId: null, 
      otherUserName: null,
      isMinimized: false,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false
    });

    // Notify other user
    if (socketRef.current && callStateRef.current.otherUserId) {
      socketRef.current.emit('call_signal', {
        type: 'call-end',
        from: userRef.current?.id,
        to: callStateRef.current.otherUserId,
      });
    }
  }, []);

  // Socket connection
  useEffect(() => {
    if (!user) return;
    
const socketInstance = io("https://mose-1n7m.onrender.com", {
  transports: ['websocket'], // Required for stable Render connections
});

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      socketInstance.emit('join_chat', { userId: user.id, userName: user.name });
      setOnlineUsers(new Set([user.id]));
    });

    socketInstance.on('message', (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });

    socketInstance.on('message_seen', (messageId: string) => {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, seen: true } : m));
    });

    socketInstance.on('message_updated', (data: Partial<Message> & { id: string }) => {
      setMessages((prev) => prev.map((m) => m.id === data.id ? { ...m, ...data, isEdited: true } : m));
    });

    socketInstance.on('message_deleted', (messageId: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socketInstance.on('online_users', (users: { userId: string; userName: string }[]) => {
      setOnlineUsers(new Set(users.map(u => u.userId)));
    });

    socketInstance.on('user_joined', (data: { userId: string }) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    });

    socketInstance.on('user_left', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    // WebRTC Call signaling
    socketInstance.on('call_signal', async (signal: CallSignal) => {
      console.log('📞 Received call signal:', signal.type, 'from:', signal.from);

      if (signal.type === 'call-request') {
        // Incoming call
        setCallState({
          type: signal.callType || 'voice',
          status: 'ringing',
          otherUserId: signal.from,
          otherUserName: null,
          isMinimized: false,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
        });
      } else if (signal.type === 'call-accept') {
        // Call was accepted - we already created peer as initiator in startCall
        console.log('📞 Call accepted by remote peer');
        // Peer should already be created and signaling
      } else if (signal.type === 'call-reject') {
        console.log('📞 Call rejected');
        endCall();
      } else if (signal.type === 'call-end') {
        console.log('📞 Call ended by other party');
        endCall();
      } else if (signal.type === 'signal') {
        // WebRTC signal data (offer, answer, or ICE candidates)
        console.log('📞 Received WebRTC signal data:', signal.signal?.type || 'ICE candidate');
        
        if (peerRef.current && signal.signal) {
          console.log('📞 Signaling peer with received data');
          peerRef.current.signal(signal.signal);
        } else if (signal.signal) {
          // Peer not ready yet - buffer the signal
          console.log('📞 Peer not ready, buffering signal. Buffer size:', signalBufferRef.current.length + 1);
          signalBufferRef.current.push(signal.signal);
        }
      }
    });

    // Supabase Realtime Backup
    const channel = supabase
      .channel('room-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as any;

          // Map snake_case from Supabase to camelCase for UI
          const transformedMessage: Message = {
            id: newMessage.id,
            senderId: newMessage.sender_id,
            senderName: newMessage.sender_name,
            senderEmoji: newMessage.sender_emoji,
            content: newMessage.content,
            messageType: newMessage.message_type,
            fileId: newMessage.file_id,
            fileUrl: newMessage.file_url,
            fileName: newMessage.file_name,
            createdAt: newMessage.created_at,
            seen: newMessage.seen || false,
            replyToId: newMessage.reply_to_id,
            replyToContent: newMessage.reply_to_content,
            replyToSender: newMessage.reply_to_sender_name,
            // Note: replyToEmoji might not be in the direct table if not saved there
            voiceDuration: newMessage.voice_duration,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === transformedMessage.id)) return prev;
            return [...prev, transformedMessage];
          });
        }
      )
      .subscribe();

    setSocket(socketInstance);
    return () => {
      console.log('Disconnecting socket and cleaning up realtime...');
      socketInstance.disconnect();
      supabase.removeChannel(channel);
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [user, endCall]);

  // Create SimplePeer instance
  const createPeer = useCallback((initiator: boolean, stream: MediaStream, otherUserId: string) => {
    console.log('🔧 Creating peer, initiator:', initiator, 'otherUserId:', otherUserId);
    
    // Destroy existing peer if any
    if (peerRef.current) {
      console.log('🔧 Destroying existing peer');
      peerRef.current.destroy();
      peerRef.current = null;
    }

    const newPeer = new SimplePeer({
      initiator,
      trickle: true, // Enable trickle ICE for better connectivity
      stream: stream,
      channelName: 'chat-call-' + Date.now(), // Unique channel name
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Add more public STUN servers for better connectivity
          { urls: 'stun:stun.stunprotocol.org:3478' },
          { urls: 'stun:stun.voip.eutelia.it:3478' },
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      },
    });

    newPeer.on('signal', (signalData) => {
      const signalType = (signalData as any).type || 'ICE candidate';
      console.log('📤 Peer signal generated:', signalType, 'sending to:', otherUserId);
      if (socketRef.current) {
        socketRef.current.emit('call_signal', {
          type: 'signal',
          from: userRef.current?.id,
          to: otherUserId,
          signal: signalData,
        });
      }
    });

    newPeer.on('stream', (stream) => {
      console.log('📥 Received remote stream!', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      setRemoteStream(stream);
      remoteStreamRef.current = stream;
      
      // Always use the video element - it handles both audio and video streams
      // For video calls, it shows video + plays audio
      // For voice calls, it just plays audio (video is hidden)
      if (remoteVideoRef.current) {
        console.log('📥 Setting remote stream to video element');
        remoteVideoRef.current.srcObject = stream;
        
        // Try to play immediately
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('📥 Remote stream playing successfully');
            })
            .catch(e => {
              console.log('📥 Autoplay blocked, will retry on user interaction:', e.message);
              // The video element should autoplay since it was triggered by user action (accepting call)
              // But if blocked, it will play when user interacts
            });
        }
      }
    });

    newPeer.on('connect', () => {
      console.log('✅ Peer connected!');
      setCallState(prev => ({ ...prev, status: 'connected' }));
    });

    newPeer.on('error', (err) => {
      console.error('❌ Peer error:', err.code || err);
      // Don't end call on all errors, some are recoverable
      if (err.code === 'ERR_DATA_CHANNEL' || err.code === 'ERR_CONNECTION_FAILURE') {
        console.error('Fatal peer error, ending call');
        endCall();
      }
    });

    newPeer.on('close', () => {
      console.log('🔌 Peer connection closed');
    });

    newPeer.on('iceStateChange', (state) => {
      console.log('🧊 ICE state changed:', state);
    });

    peerRef.current = newPeer;
    console.log('🔧 Peer created successfully');
    
    // Process any buffered signals
    if (signalBufferRef.current.length > 0) {
      console.log('🔧 Processing', signalBufferRef.current.length, 'buffered signals');
      // Use setTimeout to ensure peer is fully initialized
      setTimeout(() => {
        const bufferedSignals = [...signalBufferRef.current];
        signalBufferRef.current = [];
        bufferedSignals.forEach((signalData, index) => {
          if (peerRef.current) {
            console.log(`🔧 Processing buffered signal ${index + 1}/${bufferedSignals.length}`);
            peerRef.current.signal(signalData);
          }
        });
      }, 50);
    }
    
    return newPeer;
  }, [endCall]);

  // Load messages
  useEffect(() => {
    if (!user) return;
    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages?limit=100');
        const data = await response.json();
        if (data.success) setMessages(data.messages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMessages();
  }, [user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as seen
  useEffect(() => {
    if (socket && messages.length > 0 && user) {
      messages.filter(m => m.senderId !== user.id && !m.seen).forEach(m => {
        socket.emit('mark_seen', m.id);
      });
    }
  }, [messages, socket, user]);

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update local video when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video/audio when stream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('🔊 Remote stream changed, setting to video element');
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => {
        console.log('🔊 Play failed in effect:', e.message);
      });
    }
  }, [remoteStream]);

  const handleSendMessage = async () => {
    if (!input.trim() || sending || !user) return;
    setSending(true);
    const content = input.trim();
    setInput('');
    const replyTo = replyingTo;
    setReplyingTo(null);

    try {
      // Database-First approach: Save to Supabase via API
      // The API will trigger the broadcast to Render WebSocket
      const response = await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          senderName: user.name,
          senderEmoji: user.emoji,
          content,
          messageType: 'text',
          replyToId: replyTo?.id || null,
        }),
      });

      const data = await response.json();
      if (data.success && data.message) {
        // Optimistically update UI if not already added by socket/realtime
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
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
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (data.success && data.file) {
        const fileMetadata: FileMetadata = data.file;
        let messageType: 'image' | 'video' | 'document' = 'document';
        if (fileMetadata.mimeType.startsWith('image/')) messageType = 'image';
        else if (fileMetadata.mimeType.startsWith('video/')) messageType = 'video';

        const response = await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            messageType,
            fileId: fileMetadata.id,
            fileUrl: fileMetadata.storagePath,
            fileName: fileMetadata.originalName,
          }),
        });

        const dataSave = await response.json();
        if (dataSave.success && dataSave.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === dataSave.message.id)) return prev;
            return [...prev, dataSave.message];
          });
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Voice recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleVoiceUpload(file, recordingTime);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleVoiceUpload = async (file: File, duration: number) => {
    if (!user || !socket) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (data.success && data.file) {
        const response = await fetch('/api/messages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user.id,
            senderName: user.name,
            senderEmoji: user.emoji,
            messageType: 'voice',
            fileId: data.file.id,
            fileUrl: data.file.storagePath,
            voiceDuration: duration,
          }),
        });

        const dataSave = await response.json();
        if (dataSave.success && dataSave.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === dataSave.message.id)) return prev;
            return [...prev, dataSave.message];
          });
        }
      }
    } catch (err) {
      console.error('Voice upload error:', err);
    }
  };

  // Start a call
  const startCall = async (type: 'voice' | 'video') => {
    if (!socket || !user) return;
    const otherUserId = Array.from(onlineUsers).find(id => id !== user.id);
    if (!otherUserId) {
      alert('No other user online to call');
      return;
    }

    try {
      console.log('📞 Starting', type, 'call to:', otherUserId);
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      });
      
      console.log('🎥 Got media stream:', stream.getTracks().map(t => t.kind));
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      setCallState({
        type,
        status: 'calling',
        otherUserId,
        otherUserName: null,
        isMinimized: false,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
      });

      // Set local video
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video to prevent echo
        localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
      }

      // Create peer as initiator immediately - this will generate an offer
      createPeer(true, stream, otherUserId);

      // Send call request
      socket.emit('call_signal', {
        type: 'call-request',
        from: user.id,
        to: otherUserId,
        callType: type,
      });

      console.log('📞 Call request sent, peer created as initiator');

    } catch (err) {
      console.error('Failed to start call:', err);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  };

  // Accept an incoming call
  const acceptCall = async () => {
    if (!socket || !user || !callState.otherUserId) return;

    try {
      console.log('📞 Accepting call...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callState.type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      });
      
      console.log('🎥 Got media stream:', stream.getTracks().map(t => t.kind));
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Set local video
      if (localVideoRef.current && callState.type === 'video') {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Mute local video to prevent echo
        localVideoRef.current.play().catch(e => console.log('Local video play error:', e));
      }

      // Create peer as non-initiator (receiver) immediately
      // This prepares us to receive the offer and send an answer
      createPeer(false, stream, callState.otherUserId);

      // Send accept signal
      socket.emit('call_signal', {
        type: 'call-accept',
        from: user.id,
        to: callState.otherUserId,
      });

      console.log('📞 Call accept sent, peer created as receiver');
      
      // Update status
      setCallState(prev => ({ ...prev, status: 'calling' }));

    } catch (err) {
      console.error('Failed to accept call:', err);
      rejectCall();
    }
  };

  // Reject an incoming call
  const rejectCall = () => {
    if (socket && callState.otherUserId) {
      socket.emit('call_signal', {
        type: 'call-reject',
        from: user?.id,
        to: callState.otherUserId,
      });
    }
    endCall();
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
      }
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoOff: !videoTrack.enabled }));
      }
    }
  };

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (callState.isScreenSharing) {
      // Stop screen sharing
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      
      // Re-enable camera
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
        }
      }
      
      // Replace track in peer
      if (peerRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          const sender = (peerRef.current as any)._pc?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }
      }
      
      setCallState(prev => ({ ...prev, isScreenSharing: false }));
    } else {
      // Start screen sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        setScreenStream(displayStream);
        
        // Replace video track in peer
        const screenTrack = displayStream.getVideoTracks()[0];
        if (peerRef.current && screenTrack) {
          const sender = (peerRef.current as any)._pc?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }
        
        setCallState(prev => ({ ...prev, isScreenSharing: true }));
        
        // Handle screen share end
        screenTrack.onended = () => {
          toggleScreenShare();
        };
        
      } catch (err) {
        console.error('Failed to share screen:', err);
      }
    }
  };

  // Long press handler
  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, message: Message) => {
    e.preventDefault();
    
    longPressTimerRef.current = setTimeout(() => {
      let x = 0, y = 0;
      if ('touches' in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }
      
      setActionMenuPosition({ x, y });
      setShowActionMenu(message.id);
    }, LONG_PRESS_DURATION);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !socket) return;
    
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
    setShowActionMenu(null);
    
    socket.emit('delete_message', messageId);
    
    await fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: user.id }),
    });
  };

  const handleEditMessage = async () => {
    if (!messageToEdit || !user || !socket) return;
    
    const newContent = editContent;
    
    setMessages(prev => prev.map(m =>
      m.id === messageToEdit.id ? { ...m, content: newContent, isEdited: true, editedAt: new Date().toISOString() } : m
    ));
    setEditDialogOpen(false);
    setMessageToEdit(null);
    setEditContent('');
    setShowActionMenu(null);
    
    socket.emit('edit_message', { messageId: messageToEdit.id, content: newContent });
    
    await fetch('/api/messages/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: messageToEdit.id, userId: user.id, newContent }),
    });
  };

  const handleDeleteAllMessages = async (action: 'mine' | 'all') => {
    if (!user) return;
    const response = await fetch('/api/messages/delete-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, action }),
    });
    const data = await response.json();
    if (data.success) {
      setMessages(action === 'mine' ? prev => prev.filter(m => m.senderId !== user.id) : []);
      setDeleteAllDialogOpen(false);
      setDeleteDialogOpenOwn(false);
    }
  };

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const renderMessageContent = (message: Message) => {
    if (message.messageType === 'text') {
      return <p className="break-words whitespace-pre-wrap">{message.content}</p>;
    }
    if (message.messageType === 'image' && message.fileUrl) {
      return (
        <img src={message.fileUrl} alt={message.fileName} className="max-w-full rounded-lg cursor-pointer hover:opacity-90" onClick={() => window.open(message.fileUrl, '_blank')} />
      );
    }
    if (message.messageType === 'video' && message.fileUrl) {
      return <video src={message.fileUrl} controls className="max-w-full rounded-lg" />;
    }
    if (message.messageType === 'voice' && message.fileUrl) {
      return (
        <div className="flex items-center gap-3 p-2">
          <audio src={message.fileUrl} controls className="h-8 max-w-[200px]" />
          {message.voiceDuration && <span className="text-xs opacity-70">{formatDuration(message.voiceDuration)}</span>}
        </div>
      );
    }
    if (message.messageType === 'document' && message.fileName) {
      return (
        <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
          <FileText className="w-8 h-8 text-pink-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{message.fileName}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.open(message.fileUrl, '_blank')}>Download</Button>
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
          <p className="text-pink-300">Loading... 💕</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-950 via-purple-950 to-indigo-950 relative overflow-hidden">
      {/* Floating Emojis */}
      {floatingEmojis.map((item, i) => (
        <div key={i} className="absolute text-3xl pointer-events-none select-none opacity-30"
          style={{ left: item.left, top: item.top, animation: `floatAndPulse ${6 + Math.random() * 4}s ease-in-out infinite`, animationDelay: `${Math.random() * 3}s` }}>
          {item.emoji}
        </div>
      ))}

      {/* Inactivity Warning */}
      {inactivityWarning && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-red-900/90 backdrop-blur-md border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-white font-semibold">Redirecting in {timeLeft} seconds...</p>
                <p className="text-red-200 text-sm">Click anywhere to stay</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Menu */}
      {showActionMenu && (
        <div 
          ref={actionMenuRef}
          className="fixed z-50 bg-slate-800/95 backdrop-blur-xl border border-pink-900/50 rounded-xl shadow-2xl p-2 min-w-[150px]"
          style={{ 
            left: Math.min(actionMenuPosition.x, window.innerWidth - 180),
            top: Math.min(actionMenuPosition.y, window.innerHeight - 200)
          }}
        >
          <button
            onClick={() => {
              const msg = messages.find(m => m.id === showActionMenu);
              if (msg) setReplyingTo(msg);
              setShowActionMenu(null);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-pink-300 hover:bg-pink-900/30 rounded-lg transition-colors"
          >
            <Reply className="w-4 h-4" />
            <span>Reply</span>
          </button>
          
          {(() => {
            const msg = messages.find(m => m.id === showActionMenu);
            const isOwn = msg?.senderId === user.id;
            
            return isOwn && msg?.messageType === 'text' ? (
              <button
                onClick={() => {
                  if (msg) {
                    setMessageToEdit(msg);
                    setEditContent(msg.content || '');
                    setEditDialogOpen(true);
                  }
                  setShowActionMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : null;
          })()}
          
          {(() => {
            const msg = messages.find(m => m.id === showActionMenu);
            const isOwn = msg?.senderId === user.id;
            
            return isOwn ? (
              <button
                onClick={() => {
                  if (msg) {
                    setMessageToDelete(msg.id);
                    setDeleteDialogOpen(true);
                  }
                  setShowActionMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : null;
          })()}
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-b border-pink-900/30 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Our Chat 💕</h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-pink-300/70">{onlineUsers.size > 1 ? '🟢 Online together' : '🟢 Online'}</span>
                <span className="text-pink-700">•</span>
                <span className="text-sm text-pink-400 font-medium">{user?.emoji} {user?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => startCall('voice')} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30" title="Voice Call">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => startCall('video')} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30" title="Video Call">
              <Video className="w-5 h-5" />
            </Button>

            <Button variant="outline" size="sm" onClick={() => window.location.href = 'https://www.wikipedia.org'} className="border-red-500/50 text-red-400 hover:bg-red-900/30">
              Panic
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-pink-300 hover:text-pink-100">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
                <DropdownMenuItem onClick={() => setDeleteDialogOpenOwn(true)} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete My Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteAllDialogOpen(true)} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete All Messages
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { localStorage.removeItem('chat-user'); router.push('/'); }} className="text-pink-300 hover:text-pink-100 hover:bg-pink-900/30 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Leave Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Call UI */}
      {callState.status !== 'idle' && (
        <div className={`fixed z-50 bg-black ${callState.isMinimized ? 'bottom-4 right-4 w-48 h-36 rounded-2xl overflow-hidden shadow-2xl' : 'inset-0'} flex flex-col transition-all duration-300`}>
          {/* Video Area */}
          <div className={`relative flex-1 ${callState.type === 'video' || callState.isScreenSharing ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-900 via-pink-950/50 to-purple-950'}`}>
            {/* Remote Video - ALWAYS render but only visible for video calls */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover ${callState.type === 'video' ? '' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Local Video (picture-in-picture) - MIRRORED for natural self-view */}
            {callState.type === 'video' && localStream && !callState.isVideoOff && !callState.isMinimized && (
              <div className="absolute bottom-20 right-3 md:bottom-4 md:right-4 z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-24 h-32 md:w-36 md:h-48 rounded-2xl border-2 border-white/20 object-cover bg-black shadow-2xl"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            )}

            {/* Call Status Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Calling State */}
              {callState.status === 'calling' && (
                <div className="text-center text-white pointer-events-auto">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-pink-500/30">
                      {callState.type === 'video' ? <Video className="w-12 h-12 text-white" /> : <Phone className="w-12 h-12 text-white" />}
                    </div>
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-pink-500/30 animate-ping mx-auto" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">Calling...</p>
                  <p className="text-white/60 text-sm">Waiting for response</p>
                </div>
              )}

              {/* Ringing State */}
              {callState.status === 'ringing' && (
                <div className="text-center text-white pointer-events-auto">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30">
                      {callState.type === 'video' ? <Video className="w-12 h-12 text-white" /> : <Phone className="w-12 h-12 text-white" />}
                    </div>
                    <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/30 animate-ping mx-auto" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">Incoming {callState.type} call</p>
                  <div className="flex gap-6 justify-center mt-8">
                    <button
                      onClick={acceptCall}
                      className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110"
                    >
                      <Phone className="w-7 h-7" />
                    </button>
                    <button
                      onClick={rejectCall}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110"
                    >
                      <PhoneOff className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              )}

              {/* Voice Call Connected State */}
              {callState.status === 'connected' && callState.type === 'voice' && !callState.isScreenSharing && (
                <div className="text-center text-white">
                  <div className="relative mb-6">
                    <div className="w-36 h-36 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 flex items-center justify-center mx-auto shadow-2xl shadow-pink-500/40">
                      <Phone className="w-16 h-16 text-white" />
                    </div>
                    <div className="absolute inset-0 w-36 h-36 rounded-full bg-pink-500/20 animate-pulse mx-auto" />
                  </div>
                  <p className="text-2xl font-semibold">{callState.otherUserName || 'Partner'}</p>
                  <div className="flex items-center justify-center gap-2 mt-2 text-pink-300">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-sm">Connected</p>
                  </div>
                </div>
              )}
            </div>

            {/* Minimize/Maximize button */}
            <button
              onClick={() => setCallState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))}
              className="absolute top-3 right-3 p-2.5 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 z-20 transition-all"
            >
              {callState.isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </button>

            {/* Call Timer or status */}
            {callState.status === 'connected' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 z-20">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white text-sm font-medium">
                  {callState.type === 'video' ? 'Video' : 'Voice'}
                </span>
              </div>
            )}
          </div>

          {/* Call Controls */}
          {(callState.status === 'connected' || callState.status === 'calling') && !callState.isMinimized && (
            <div className="bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl px-6 py-5">
              <div className="flex items-center justify-center gap-5">
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 ${callState.isMuted ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {callState.isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                </button>

                {/* Video Toggle Button (video calls only) */}
                {callState.type === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 ${callState.isVideoOff ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {callState.isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                  </button>
                )}

                {/* End Call Button */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>

                {/* Screen Share Button (video calls only) */}
                {callState.type === 'video' && (
                  <button
                    onClick={toggleScreenShare}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 ${callState.isScreenSharing ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <Monitor className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 pt-20 pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Heart className="w-12 h-12 text-pink-400 fill-pink-400/30" />
              </div>
              <p className="text-pink-300 font-medium text-lg">No messages yet 💕</p>
              <p className="text-sm text-pink-400/60 mt-2">Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.senderId === user.id;

              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {/* Reply preview */}
                    {message.replyToId && (
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${
                        isOwn ? 'bg-pink-500/30 text-pink-100' : 'bg-slate-600/50 text-pink-200'
                      } border-l-2 border-purple-400 mb-0.5 max-w-full`}>
                        <Reply className="w-3 h-3 flex-shrink-0 text-purple-300" />
                        <span className="font-medium text-purple-300">{message.replyToSender || 'User'}</span>
                        <span className="text-white/50 truncate flex-1">{message.replyToContent || '...'}</span>
                      </div>
                    )}

                    <div className="relative">
                      <Card
                        className={`overflow-hidden backdrop-blur-md transition-all cursor-pointer select-none ${
                          isOwn
                            ? 'bg-gradient-to-br from-pink-600/80 to-purple-600/80 text-white border-0 shadow-lg shadow-pink-900/20'
                            : 'bg-slate-800/60 backdrop-blur-md border-pink-900/30'
                        }`}
                        onTouchStart={(e) => handleLongPressStart(e, message)}
                        onTouchEnd={handleLongPressEnd}
                        onMouseDown={(e) => handleLongPressStart(e, message)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                      >
                        <div className="px-3 py-2">
                          {!isOwn && message.senderName && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-xs">{message.senderEmoji || '💕'}</span>
                              <span className="text-xs text-pink-400 font-medium">{message.senderName}</span>
                            </div>
                          )}
                          {renderMessageContent(message)}
                          {message.isEdited && (
                            <p className="text-xs text-white/50 mt-1 italic">✏️ Edited</p>
                          )}
                        </div>
                      </Card>
                    </div>

                    {/* Time & seen */}
                    <div className="flex items-center gap-2 px-1 mt-1">
                      <span className="text-xs text-pink-400/50">{formatTime(message.createdAt)}</span>
                      {isOwn && message.seen && <span className="text-xs text-pink-400/50">Seen 💕</span>}
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
      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-slate-900/80 backdrop-blur-xl border-t border-pink-900/30 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Reply preview */}
          {replyingTo && (
            <div className="flex items-center justify-between gap-3 mb-2 px-4 py-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Reply className="w-4 h-4 text-purple-300" />
                <div>
                  <span className="text-xs font-semibold text-purple-300">Replying to {replyingTo.senderName}</span>
                  <p className="text-xs text-white/60 truncate">{replyingTo.content || '...'}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6 w-6 p-0 text-purple-400">
                ✕
              </Button>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 mb-2 px-4 py-2 bg-red-900/30 rounded-lg border border-red-700/50">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-300 text-sm">Recording: {formatDuration(recordingTime)}</span>
              <Button variant="ghost" size="sm" onClick={stopVoiceRecording} className="ml-auto text-red-400">Stop</Button>
            </div>
          )}

          {/* Emoji picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 right-4 bg-slate-800/95 backdrop-blur-xl border border-pink-900/50 rounded-lg p-3 max-w-2xl mx-auto z-50">
              <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-2 border-b border-white/10">
                {EMOJI_CATEGORIES.map((category, index) => (
                  <button key={index} onClick={() => setSelectedCategory(index)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-2xl ${selectedCategory === index ? 'bg-pink-600/30 ring-2 ring-pink-500' : 'hover:bg-white/10'}`}>
                    {category.icon}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-64 overflow-y-auto">
                {EMOJI_CATEGORIES[selectedCategory].emojis.map((emoji, index) => (
                  <button key={index} onClick={() => { setInput(prev => prev + emoji); setShowEmojiPicker(false); }} className="text-2xl p-2 hover:bg-pink-900/30 rounded-lg">
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />

            <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="border-pink-700/50 hover:bg-pink-900/30 text-pink-300">
              {uploading ? <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
            </Button>

            <Button type="button" variant="outline" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`border-pink-700/50 hover:bg-pink-900/30 text-pink-300 ${showEmojiPicker ? 'bg-pink-900/30' : ''}`}>
              <Smile className="w-4 h-4" />
            </Button>

            <Button type="button" variant="outline" size="icon" onMouseDown={startVoiceRecording} onMouseUp={stopVoiceRecording} onTouchStart={startVoiceRecording} onTouchEnd={stopVoiceRecording} className={`border-pink-700/50 hover:bg-pink-900/30 text-pink-300 ${isRecording ? 'bg-red-900/50 animate-pulse' : ''}`}>
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message... 💕" className="flex-1 bg-slate-800/50 border-pink-700/50 text-pink-100" disabled={sending || uploading} />

            <Button type="submit" size="icon" disabled={!input.trim() || sending} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500">
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </footer>

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Delete message?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Edit Message</AlertDialogTitle>
          </AlertDialogHeader>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-32 bg-slate-800/50 border-pink-700/50 rounded-lg p-3 text-pink-100" />
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditMessage} className="bg-blue-600 hover:bg-blue-700" disabled={!editContent.trim()}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Delete All Messages?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">This will delete ALL messages for both users!</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteAllMessages('all')} className="bg-red-600 hover:bg-red-700">Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpenOwn} onOpenChange={setDeleteDialogOpenOwn}>
        <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-pink-900/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-pink-100">Delete Your Messages?</AlertDialogTitle>
            <AlertDialogDescription className="text-pink-200/80">This will delete only YOUR messages.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-pink-700/50 text-pink-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteAllMessages('mine')} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        @keyframes floatAndPulse {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
