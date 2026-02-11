import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Check if everything is set up
  const setupStatus = {
    messagesTable: false,
    storageBucket: false,
  };

  try {
    // Check messages table
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);

    if (!messagesError || messagesError.code !== '42P01') {
      setupStatus.messagesTable = true;
    }
  } catch (e) {
    // Table doesn't exist
  }

  try {
    // Check storage bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    setupStatus.storageBucket = buckets?.some(b => b.name === 'chat-files') || false;
  } catch (e) {
    // Bucket check failed
  }

  const isSetupComplete = setupStatus.messagesTable && setupStatus.storageBucket;

  return NextResponse.json({
    isSetupComplete,
    ...setupStatus,
    needsSetup: !isSetupComplete,
  });
}
