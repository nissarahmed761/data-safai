import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // You can fetch additional user data from your database here
    // For now, we'll return the basic user info from Clerk
    return NextResponse.json({ 
      userId,
      message: 'User authenticated successfully' 
    });
  } catch (error) {
    console.error('User API error:', error);
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    );
  }
} 