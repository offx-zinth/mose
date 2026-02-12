import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET reactions for a message
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const reactions = await db.reaction.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      reactions: reactions.map(r => ({
        id: r.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Fetch reactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// POST - add or toggle reaction
export async function POST(request: NextRequest) {
  try {
    const { messageId, userId, emoji } = await request.json();

    if (!messageId || !userId || !emoji) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if reaction already exists
    const existingReaction = await db.reaction.findFirst({
      where: { messageId, userId },
    });

    if (existingReaction) {
      // If same emoji, remove it (toggle off)
      if (existingReaction.emoji === emoji) {
        await db.reaction.delete({
          where: { id: existingReaction.id },
        });

        const remainingReactions = await db.reaction.findMany({
          where: { messageId },
          orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
          success: true,
          action: 'removed',
          reactions: remainingReactions.map(r => ({
            id: r.id,
            messageId: r.messageId,
            userId: r.userId,
            emoji: r.emoji,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } else {
        // Different emoji, update it
        await db.reaction.update({
          where: { id: existingReaction.id },
          data: { emoji },
        });

        const allReactions = await db.reaction.findMany({
          where: { messageId },
          orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
          success: true,
          action: 'updated',
          reactions: allReactions.map(r => ({
            id: r.id,
            messageId: r.messageId,
            userId: r.userId,
            emoji: r.emoji,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      }
    }

    // Create new reaction
    await db.reaction.create({
      data: { messageId, userId, emoji },
    });

    const allReactions = await db.reaction.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      action: 'added',
      reactions: allReactions.map(r => ({
        id: r.id,
        messageId: r.messageId,
        userId: r.userId,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Reaction error:', error);
    return NextResponse.json(
      { error: 'Failed to process reaction' },
      { status: 500 }
    );
  }
}
