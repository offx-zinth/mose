import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { senderId, senderName, senderEmoji, content, messageType, fileId, fileUrl, fileName, replyToId, voiceDuration } = await request.json();

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
        voiceDuration: voiceDuration || null,
        seen: false,
        isEdited: false,
      },
      include: {
        reactions: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: {
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
        isEdited: message.isEdited,
        editedAt: message.editedAt?.toISOString() || null,
        voiceDuration: message.voiceDuration,
        reactions: [],
      },
    });
  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}
