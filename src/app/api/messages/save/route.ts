import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { senderId, senderName, senderEmoji, content, messageType, fileId, fileUrl, fileName, replyToId } = await request.json();

    if (!senderId || !messageType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const validTypes = ['text', 'image', 'video', 'document'];
    if (!validTypes.includes(messageType)) {
      return NextResponse.json(
        { error: 'Invalid message type' },
        { status: 400 }
      );
    }

    if (messageType === 'text' && !content) {
      return NextResponse.json(
        { error: 'Text content is required for text messages' },
        { status: 400 }
      );
    }

    if (['image', 'video', 'document'].includes(messageType) && !fileId) {
      return NextResponse.json(
        { error: 'File ID is required for file messages' },
        { status: 400 }
      );
    }

    // Fetch reply information if replying
    let replyData = null;
    if (replyToId) {
      const { data: replyMessage } = await supabase
        .from('messages')
        .select('id, content, sender_name')
        .eq('id', replyToId)
        .single();

      if (replyMessage) {
        replyData = {
          replyToId: replyMessage.id,
          replyToContent: replyMessage.content,
          replyToSender: replyMessage.sender_name,
        };
      }
    }

    // Insert message into Supabase
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        sender_name: senderName,
        sender_emoji: senderEmoji,
        content: content || null,
        message_type: messageType,
        file_id: fileId || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        reply_to_id: replyToId || null,
        seen: false,
        is_edited: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderEmoji: message.sender_emoji,
        content: message.content,
        messageType: message.message_type,
        fileId: message.file_id,
        fileUrl: message.file_url,
        fileName: message.file_name,
        createdAt: message.created_at,
        seen: message.seen,
        replyToId: message.reply_to_id,
        ...replyData,
        isEdited: message.is_edited,
        editedAt: message.edited_at,
      },
    });
  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}
