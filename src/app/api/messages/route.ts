import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch messages from Supabase
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Fetch reply messages
    const replyToIds = messages
      .map(msg => msg.reply_to_id)
      .filter((id): id is string => id !== null);

    let replyToMessages: any[] = [];
    if (replyToIds.length > 0) {
      const { data: replies } = await supabase
        .from('messages')
        .select('id, sender_name, content')
        .in('id', replyToIds);
      replyToMessages = replies || [];
    }

    // Create a map for quick lookup
    const replyMap = new Map(
      replyToMessages.map(r => [r.id, { content: r.content, sender: r.sender_name }])
    );

    // Transform data to match our interface
    const transformedMessages = messages.map(msg => {
      const replyInfo = replyMap.get(msg.reply_to_id);
      return {
        id: msg.id,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        senderEmoji: msg.sender_emoji,
        content: msg.content,
        messageType: msg.message_type,
        fileId: msg.file_id,
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        createdAt: msg.created_at,
        seen: msg.seen,
        replyToId: msg.reply_to_id,
        replyToContent: replyInfo?.content || null,
        replyToSender: replyInfo?.sender || null,
        isEdited: msg.is_edited || false,
        editedAt: msg.edited_at || null,
      };
    });

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
