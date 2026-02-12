import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET call history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const calls = await db.call.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      calls: calls.map(c => ({
        id: c.id,
        callerId: c.callerId,
        callerName: c.callerName,
        receiverId: c.receiverId,
        callType: c.callType,
        status: c.status,
        startedAt: c.startedAt?.toISOString(),
        endedAt: c.endedAt?.toISOString(),
        duration: c.duration,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Fetch calls error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}

// POST - log call metadata
export async function POST(request: NextRequest) {
  try {
    const { callerId, callerName, receiverId, callType, status, duration } = await request.json();

    if (!callerId || !callType || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const call = await db.call.create({
      data: {
        callerId,
        callerName,
        receiverId,
        callType,
        status,
        duration,
        startedAt: status === 'answered' ? new Date() : null,
        endedAt: status === 'ended' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      call: {
        id: call.id,
        callerId: call.callerId,
        callerName: call.callerName,
        receiverId: call.receiverId,
        callType: call.callType,
        status: call.status,
        duration: call.duration,
        createdAt: call.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Create call error:', error);
    return NextResponse.json(
      { error: 'Failed to log call' },
      { status: 500 }
    );
  }
}

// PUT - update call (for ending calls, etc.)
export async function PUT(request: NextRequest) {
  try {
    const { callId, status, duration } = await request.json();

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    const call = await db.call.update({
      where: { id: callId },
      data: {
        status,
        duration,
        endedAt: status === 'ended' || status === 'declined' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      call: {
        id: call.id,
        status: call.status,
        duration: call.duration,
        endedAt: call.endedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update call error:', error);
    return NextResponse.json(
      { error: 'Failed to update call' },
      { status: 500 }
    );
  }
}
