import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET active watch together session
export async function GET(request: NextRequest) {
  try {
    const activeSession = await db.watchTogether.findFirst({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSession) {
      return NextResponse.json({
        success: true,
        session: null,
      });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: activeSession.id,
        hostId: activeSession.hostId,
        hostName: activeSession.hostName,
        videoUrl: activeSession.videoUrl,
        status: activeSession.status,
        currentTime: activeSession.currentTime,
        isPlaying: activeSession.isPlaying,
        createdAt: activeSession.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Fetch watch together error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// POST - create or update watch together session
export async function POST(request: NextRequest) {
  try {
    const { hostId, hostName, videoUrl, currentTime, isPlaying, action } = await request.json();

    if (action === 'create') {
      // End any existing sessions
      await db.watchTogether.updateMany({
        where: { status: 'active' },
        data: { status: 'ended', endedAt: new Date() },
      });

      // Create new session
      const session = await db.watchTogether.create({
        data: {
          hostId,
          hostName,
          videoUrl,
          currentTime: currentTime || 0,
          isPlaying: isPlaying || false,
          status: 'active',
        },
      });

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          hostId: session.hostId,
          hostName: session.hostName,
          videoUrl: session.videoUrl,
          currentTime: session.currentTime,
          isPlaying: session.isPlaying,
          status: session.status,
          createdAt: session.createdAt.toISOString(),
        },
      });
    }

    if (action === 'update') {
      const activeSession = await db.watchTogether.findFirst({
        where: { status: 'active' },
      });

      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active session' },
          { status: 404 }
        );
      }

      const updatedSession = await db.watchTogether.update({
        where: { id: activeSession.id },
        data: {
          videoUrl,
          currentTime,
          isPlaying,
        },
      });

      return NextResponse.json({
        success: true,
        session: {
          id: updatedSession.id,
          currentTime: updatedSession.currentTime,
          isPlaying: updatedSession.isPlaying,
        },
      });
    }

    if (action === 'end') {
      await db.watchTogether.updateMany({
        where: { status: 'active' },
        data: { status: 'ended', endedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Session ended',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Watch together error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
