import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { messageId, userId, newContent } = await request.json();

    if (!messageId || !userId || newContent === undefined) {
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
        { success: false, error: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    // Update the message
    await db.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        editedAt: new Date(),
        isEdited: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Edit message error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}
