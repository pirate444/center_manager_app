import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';

/**
 * POST /api/users/push-token
 * Body: { userId: string, pushToken: string }
 *
 * Dedicated endpoint for the mobile app to register/update an Expo push token.
 * More reliable than the generic PUT /api/users/:id because it:
 * - Validates the token format
 * - Logs success/failure for debugging
 * - Returns clear error messages
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId, pushToken } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    if (!pushToken) {
      return NextResponse.json({ error: 'pushToken is required' }, { status: 400 });
    }

    // Validate Expo push token format
    if (
      !pushToken.startsWith('ExponentPushToken[') &&
      !pushToken.startsWith('ExpoPushToken[')
    ) {
      console.error(`[push-token] Invalid token format for user ${userId}: ${pushToken}`);
      return NextResponse.json(
        { error: 'Invalid push token format. Expected ExponentPushToken[...] or ExpoPushToken[...]' },
        { status: 400 }
      );
    }

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { pushToken },
      { new: true }
    );

    if (!user) {
      console.error(`[push-token] User not found: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(
      `[push-token] ✅ Token saved for ${user.firstName} ${user.lastName} (${user.role}): ${pushToken.slice(0, 30)}...`
    );

    return NextResponse.json({ success: true, userId: user._id.toString() });
  } catch (error: any) {
    console.error('[push-token] Error saving push token:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
