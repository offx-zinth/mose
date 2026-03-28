import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { senderId, senderName, senderEmoji, content, messageType, fileId, fileUrl, fileName, replyToId } = await request.json();

    if (!senderId || !messageType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validTypes = ['text', 'image', 'video', 'document', 'voice'];
    if (!validTypes.includes(messageType)) {
      return NextResponse.json(
        { error: 'Invalid message type' },
        { status: 400 }
      );
    }

    if (messageType === 'text' && !content) {
      return NextResponse.json(
        { error: 'Text content is required for text messages' },
        { status: 400 }
      );
    }

    // Fetch parent message if replying
    let parentMessage = null;
    if (replyToId) {
      parentMessage = await db.message.findUnique({
        where: { id: replyToId },
        select: { content: true, senderName: true, senderEmoji: true },
      });
    }

    // Insert message into database
    const message = await db.message.create({
      data: {
        senderId,
        senderName,
        senderEmoji,
        content: content || null,
        messageType,
        fileId: fileId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        replyToId: replyToId || null,
        seen: false,
        isEdited: false,
      },
      include: {
        reactions: true,
      },
    });

    const transformedMessage = {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      senderEmoji: message.senderEmoji,
      content: message.content,
      messageType: message.messageType,
      fileId: message.fileId,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      createdAt: message.createdAt.toISOString(),
      seen: message.seen,
      replyToId: message.replyToId,
      replyToContent: parentMessage?.content || null,
      replyToSender: parentMessage?.senderName || null,
      replyToEmoji: parentMessage?.senderEmoji || null,
      isEdited: message.isEdited,
      editedAt: message.editedAt?.toISOString() || null,
      reactions: [],
    };

    // Trigger broadcast to Render WebSocket server (non-blocking)
    const RENDER_WS_URL = "https://mose-1n7m.onrender.com/api/broadcast";
    fetch(RENDER_WS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transformedMessage),
    }).catch(err => console.error('Failed to broadcast to Render:', err));

    return NextResponse.json({
      success: true,
      message: transformedMessage,
    });
  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}
