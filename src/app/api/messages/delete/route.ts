import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { messageId, userId } = await request.json();

    if (!messageId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, verify the message belongs to the user
    const message = await db.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    if (message.senderId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Delete reactions first
    await db.reaction.deleteMany({
      where: { messageId },
    });

    // Delete the message
    await db.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
