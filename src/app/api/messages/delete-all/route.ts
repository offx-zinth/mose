import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing user ID' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'mine') {
      // Delete only user's own messages
      result = await supabase
        .from('messages')
        .delete()
        .eq('sender_id', userId);
    } else if (action === 'all') {
      // Delete all messages (for both users)
      result = await supabase
        .from('messages')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const { error } = result;

    if (error) {
      console.error('Delete all error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Delete all messages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}
