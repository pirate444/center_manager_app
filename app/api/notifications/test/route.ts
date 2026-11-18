import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import { sendExpoPushNotifications, ExpoPushMessage } from '@/lib/push-notifications';

/**
 * POST /api/notifications/test
 * Body: { userId: string }
 *
 * Sends a test push notification to a specific user.
 * Used to verify push tokens are stored and notifications work end-to-end.
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await UserModel.findById(userId).select(
      'firstName lastName role pushToken'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.pushToken) {
      return NextResponse.json(
        {
          error: 'No push token stored for this user',
          user: `${user.firstName} ${user.lastName} (${user.role})`,
          hint: 'The user needs to open the mobile app and log in to register their push token.',
        },
        { status: 400 }
      );
    }

    const message: ExpoPushMessage = {
      to: user.pushToken,
      title: '🔔 Test Notification',
      body: `Hello ${user.firstName}! This is a test notification from the education center.`,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      data: { type: 'test' },
    };

    const result = await sendExpoPushNotifications([message]);

    return NextResponse.json({
      success: true,
      user: `${user.firstName} ${user.lastName} (${user.role})`,
      token: user.pushToken,
      expoResponse: result,
    });
  } catch (error: any) {
    console.error('[test-notification] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/notifications/test
 *
 * Lists all users with their push token status.
 * Useful for debugging which users have registered tokens.
 */
export async function GET() {
  try {
    await dbConnect();

    const users = await UserModel.find(
      {},
      { firstName: 1, lastName: 1, role: 1, pushToken: 1, studentId: 1, teacherId: 1 }
    );

    const summary = users.map((u) => ({
      id: u._id.toString(),
      name: `${u.firstName} ${u.lastName}`,
      role: u.role,
      studentId: u.studentId || null,
      teacherId: u.teacherId || null,
      hasToken: Boolean(u.pushToken),
      tokenPreview: u.pushToken ? u.pushToken.slice(0, 25) + '...' : null,
    }));

    const withTokens = summary.filter((u) => u.hasToken).length;

    return NextResponse.json({
      totalUsers: summary.length,
      usersWithTokens: withTokens,
      usersWithoutTokens: summary.length - withTokens,
      users: summary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
