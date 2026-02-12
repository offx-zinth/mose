import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Fetch messages from database
    const messages = await db.message.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        reactions: true,
      },
    });

    // Transform data to match our interface
    const transformedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderEmoji: msg.senderEmoji,
      content: msg.content,
      messageType: msg.messageType,
      fileId: msg.fileId,
      fileUrl: msg.fileUrl,
      fileName: msg.fileName,
      createdAt: msg.createdAt.toISOString(),
      seen: msg.seen,
      replyToId: msg.replyToId,
      isEdited: msg.isEdited,
      editedAt: msg.editedAt?.toISOString() || null,
      voiceDuration: msg.voiceDuration,
      reactions: msg.reactions.map(r => ({
        id: r.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
    }));

    // Return in chronological order
    return NextResponse.json({
      success: true,
      messages: transformedMessages.reverse(),
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
