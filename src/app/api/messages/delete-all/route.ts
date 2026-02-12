import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (action === 'mine') {
      // Get user's message IDs
      const userMessages = await db.message.findMany({
        where: { senderId: userId },
        select: { id: true },
      });

      const messageIds = userMessages.map(m => m.id);

      // Delete reactions for these messages
      await db.reaction.deleteMany({
        where: { messageId: { in: messageIds } },
      });

      // Delete user's messages
      await db.message.deleteMany({
        where: { senderId: userId },
      });
    } else if (action === 'all') {
      // Delete all reactions
      await db.reaction.deleteMany({});

      // Delete all messages
      await db.message.deleteMany({});
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}
