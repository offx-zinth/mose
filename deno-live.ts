// deno-server.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { Server } from "npm:socket.io@4.7.5";
 
const io = new Server({
  cors: {
    origin: "*", // In production, use your Vercel domain
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});
 
interface User {
  id: string
  username: string
}
 
interface Message {
  id: string
  username: string
  content: string
  timestamp: Date
  type: 'user' | 'system'
}
 
const users = new Map<string, User>()
 
const generateMessageId = () => Math.random().toString(36).substr(2, 9)
 
const createSystemMessage = (content: string): Message => ({
  id: generateMessageId(),
  username: 'System',
  content,
  timestamp: new Date(),
  type: 'system'
})
 
const createUserMessage = (username: string, content: string): Message => ({
  id: generateMessageId(),
  username,
  content,
  timestamp: new Date(),
  type: 'user'
})
 
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)
 
  socket.on('test', (data) => {
    console.log('Received test message:', data)
    socket.emit('test-response', { 
      message: 'Server received test message', 
      data: data,
      timestamp: new Date().toISOString()
    })
  })
 
  socket.on('join', (data: { username: string }) => {
    const { username } = data
    
    const user: User = {
      id: socket.id,
      username
    }
    
    users.set(socket.id, user)
    
    const joinMessage = createSystemMessage(`${username} joined the chat room`)
    io.emit('user-joined', { user, message: joinMessage })
    
    const usersList = Array.from(users.values())
    socket.emit('users-list', { users: usersList })
    
    console.log(`${username} joined, online: ${users.size}`)
  })
 
  socket.on('message', (data: { content: string; username: string }) => {
    const { content, username } = data
    const user = users.get(socket.id)
    
    if (user && user.username === username) {
      const message = createUserMessage(username, content)
      io.emit('message', message)
      console.log(`${username}: ${content}`)
    }
  })
 
  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    
    if (user) {
      users.delete(socket.id)
      
      const leaveMessage = createSystemMessage(`${user.username} left the chat room`)
      io.emit('user-left', { user: { id: socket.id, username: user.username }, message: leaveMessage })
      
      console.log(`${user.username} left, online: ${users.size}`)
    }
  })
 
  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})
 
// Deno Deploy handler
await serve(io.handler(), {
  onListen: ({ port, hostname }) => {
    console.log(`WebSocket server running on http://${hostname}:${port}`)
  }
})
