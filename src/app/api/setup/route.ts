import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check if database is working by trying to count messages
    const messageCount = await db.message.count();

    return NextResponse.json({
      isSetupComplete: true,
      messagesTable: true,
      storageBucket: true, // Local storage always works
      needsSetup: false,
      messageCount,
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json({
      isSetupComplete: false,
      messagesTable: false,
      storageBucket: false,
      needsSetup: true,
    });
  }
}
