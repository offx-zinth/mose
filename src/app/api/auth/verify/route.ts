import { NextRequest, NextResponse } from 'next/server';
import { COUPLE_USERS, REDIRECT_URL } from '@/lib/supabase';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(ip: string): string {
  return `auth:${ip}`;
}

function isRateLimited(ip: string): boolean {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const data = rateLimitMap.get(key);

  if (!data || now > data.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (data.count >= MAX_ATTEMPTS) {
    return true;
  }

  data.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    // Check if code matches any user
    const matchedUser = COUPLE_USERS.find(u => u.code === code);

    if (matchedUser) {
      // Correct secret code - return user info
      return NextResponse.json({
        success: true,
        message: 'Welcome, my love! 💕',
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          emoji: matchedUser.emoji,
        }
      });
    } else {
      // Wrong code - redirect to fake URL
      return NextResponse.json({
        success: false,
        redirect: REDIRECT_URL
      });
    }
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
