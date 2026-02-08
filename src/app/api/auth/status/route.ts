import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Session-based auth - always require authentication on page load
    // Users must enter their code every time they refresh
    return NextResponse.json({
      authenticated: false,
    });
  } catch (error) {
    console.error('Auth status error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
