import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { type, data } = await req.json();
    
    switch (type) {
      case 'user.created':
        // Handle new user creation
        console.log('New user created:', data.id);
        break;
      case 'user.updated':
        // Handle user updates
        console.log('User updated:', data.id);
        break;
      case 'user.deleted':
        // Handle user deletion
        console.log('User deleted:', data.id);
        break;
      default:
        console.log('Unhandled webhook type:', type);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    );
  }
} 