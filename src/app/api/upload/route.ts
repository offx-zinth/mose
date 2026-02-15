import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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
  audio: {
    maxSize: 25 * 1024 * 1024,
    allowedTypes: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'],
  },
};

const BUCKET_NAME = 'chat-files';

function getFileType(mimeType: string): 'image' | 'video' | 'document' | 'audio' | null {
  if (FILE_CONFIG.image.allowedTypes.includes(mimeType)) return 'image';
  if (FILE_CONFIG.video.allowedTypes.includes(mimeType)) return 'video';
  if (FILE_CONFIG.document.allowedTypes.includes(mimeType)) return 'document';
  if (FILE_CONFIG.audio.allowedTypes.includes(mimeType)) return 'audio';
  return null;
}

function validateFile(file: File, fileType: 'image' | 'video' | 'document' | 'audio'): { valid: boolean; error?: string } {
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
  let tempFilePath: string | null = null;
  
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
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Try to upload to Supabase first
    let storagePath: string;
    let publicUrl: string;

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(uniqueFilename, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.log('Supabase upload failed, falling back to local storage:', error.message);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(uniqueFilename);

      storagePath = urlData.publicUrl;
      publicUrl = urlData.publicUrl;
    } catch (supabaseError) {
      // Fallback to local storage
      console.log('Using local storage as fallback');
      
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, uniqueFilename);
      await writeFile(filePath, buffer);
      
      storagePath = `/uploads/${uniqueFilename}`;
      publicUrl = storagePath;
    }

    // Save file metadata to database
    const fileRecord = await db.file.create({
      data: {
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        storagePath: storagePath,
      },
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        storagePath: fileRecord.storagePath,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  } finally {
    // Clean up temp file if it exists
    if (tempFilePath && existsSync(tempFilePath)) {
      try {
        await unlink(tempFilePath);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }
  }
}
