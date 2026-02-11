import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const FILE_CONFIG = {
  image: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  },
  video: {
    maxSize: 50 * 1024 * 1024,
    allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  },
  document: {
    maxSize: 25 * 1024 * 1024,
    allowedTypes: [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};

function getFileType(mimeType: string): 'image' | 'video' | 'document' | null {
  if (FILE_CONFIG.image.allowedTypes.includes(mimeType)) return 'image';
  if (FILE_CONFIG.video.allowedTypes.includes(mimeType)) return 'video';
  if (FILE_CONFIG.document.allowedTypes.includes(mimeType)) return 'document';
  return null;
}

function validateFile(file: File, fileType: 'image' | 'video' | 'document'): { valid: boolean; error?: string } {
  const config = FILE_CONFIG[fileType];

  if (file.size > config.maxSize) {
    const maxSizeMB = Math.round(config.maxSize / (1024 * 1024));
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  if (!config.allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }

  return { valid: true };
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const ext = sanitized.includes('.') ? '.' + sanitized.split('.').pop() : '';
  const baseName = sanitized.replace(/\.[^/.]+$/, '');

  return `${baseName}-${timestamp}-${random}${ext}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileType = getFileType(file.type);
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    const validation = validateFile(file, fileType);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const uniqueFilename = generateUniqueFilename(file.name);
    const filePath = `chat-files/${uniqueFilename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    // Generate a unique ID for the file
    const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        storagePath: urlData.publicUrl,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
