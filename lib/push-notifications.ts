import UserModel from '@/models/User';
import ClassItemModel from '@/models/ClassItem';
import dbConnect from '@/lib/mongodb';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
}

/**
 * Send raw push notifications via Expo Push API
 */
export async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<any[]> {
  const validMessages = messages.filter(
    (m) =>
      typeof m.to === 'string' &&
      (m.to.startsWith('ExponentPushToken[') || m.to.startsWith('ExpoPushToken['))
  );

  if (validMessages.length === 0) {
    console.log('[push] No valid push tokens to send to. Messages had', messages.length, 'entries.');
    return [];
  }

  console.log(`[push] Sending ${validMessages.length} push notification(s)...`);

  const results: any[] = [];
  const chunkSize = 100;

  for (let i = 0; i < validMessages.length; i += chunkSize) {
    const chunk = validMessages.slice(i, i + chunkSize);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[push] Expo push API error:', response.status, errorText);
      } else {
        const data = await response.json();
        console.log('[push] Expo push API response:', JSON.stringify(data));
        results.push(data);
      }
    } catch (err) {
      console.error('Failed to dispatch push notification chunk:', err);
    }
  }

  return results;
}

/**
 * Retrieve push tokens for specified users, students, teachers, or roles
 */
export async function getPushTokens(params: {
  userIds?: string[];
  studentIds?: string[];
  teacherIds?: string[];
  roles?: string[];
}): Promise<string[]> {
  await dbConnect();

  const conditions: any[] = [];

  if (params.userIds && params.userIds.length > 0) {
    conditions.push({ _id: { $in: params.userIds } });
  }
  if (params.studentIds && params.studentIds.length > 0) {
    conditions.push({ studentId: { $in: params.studentIds } });
  }
  if (params.teacherIds && params.teacherIds.length > 0) {
    conditions.push({ teacherId: { $in: params.teacherIds } });
  }
  if (params.roles && params.roles.length > 0) {
    conditions.push({ role: { $in: params.roles } });
  }

  if (conditions.length === 0) {
    return [];
  }

  const users = await UserModel.find({
    $and: [
      { isActive: { $ne: false } },
      { pushToken: { $exists: true, $ne: '' } },
      { $or: conditions },
    ],
  }).select('pushToken');

  const tokens = users
    .map((u) => u.pushToken)
    .filter((token): token is string => Boolean(token && token.trim()));

  return Array.from(new Set(tokens));
}

/**
 * Dispatch notification to matching users
 */
export async function notifyUsers(
  params: {
    userIds?: string[];
    studentIds?: string[];
    teacherIds?: string[];
    roles?: string[];
  },
  payload: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
) {
  try {
    const tokens = await getPushTokens(params);
    console.log(`[push] Found ${tokens.length} push token(s) for params:`, JSON.stringify(params));
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      data: payload.data,
    }));

    await sendExpoPushNotifications(messages);
  } catch (err) {
    console.error('Error sending push notification to users:', err);
  }
}

/**
 * Triggered on new message creation
 */
export async function notifyNewMessage(message: {
  _id?: any;
  senderId?: string;
  senderRole?: string;
  recipientIds?: string[];
  recipientUserIds?: string[];
  subject: string;
  body: string;
}) {
  try {
    // Determine sender name if possible
    let senderLabel = 'EduCenter';
    if (message.senderId) {
      await dbConnect();
      const sender = await UserModel.findById(message.senderId).select('firstName lastName role');
      if (sender) {
        senderLabel = `${sender.firstName} ${sender.lastName}`;
      }
    }

    const title = `Message from ${senderLabel}: ${message.subject || 'New message'}`;
    const cleanBody = (message.body || '').replace(/\s+/g, ' ').trim();
    const truncatedBody = cleanBody.length > 120 ? cleanBody.slice(0, 117) + '...' : cleanBody;

    await notifyUsers(
      {
        userIds: message.recipientUserIds,
        studentIds: message.recipientIds,
        teacherIds: message.recipientIds,
      },
      {
        title,
        body: truncatedBody,
        data: {
          type: 'message',
          url: '/(tabs)/messages',
          messageId: message._id?.toString(),
        },
      }
    );
  } catch (err) {
    console.error('Failed to notify for new message:', err);
  }
}

/**
 * Triggered when a new resource is confirmed/uploaded for a class
 */
export async function notifyNewResource(params: {
  classId: string;
  fileName: string;
  uploadedBy?: string;
}) {
  try {
    await dbConnect();
    const classItem = await ClassItemModel.findById(params.classId);
    if (!classItem) return;

    let uploaderName = 'Teacher';
    if (params.uploadedBy) {
      const uploader = await UserModel.findById(params.uploadedBy).select('firstName lastName');
      if (uploader) {
        uploaderName = `${uploader.firstName} ${uploader.lastName}`;
      }
    }

    const title = `New Resource: ${classItem.name}`;
    const body = `${uploaderName} uploaded "${params.fileName}" in ${classItem.name}`;

    // Target all enrolled students in this class
    await notifyUsers(
      {
        studentIds: classItem.enrolledStudentIds || [],
      },
      {
        title,
        body,
        data: {
          type: 'resource',
          url: '/resources',
          classId: params.classId,
        },
      }
    );
  } catch (err) {
    console.error('Failed to notify for new resource:', err);
  }
}

/**
 * Triggered when class schedule or room is updated
 */
export async function notifyScheduleUpdate(params: {
  classId: string;
  details?: string;
}) {
  try {
    await dbConnect();
    const classItem = await ClassItemModel.findById(params.classId);
    if (!classItem) return;

    const title = `Schedule Update: ${classItem.name}`;
    const body =
      params.details ||
      `The schedule or room for ${classItem.name} has been updated. Check your timetable.`;

    await notifyUsers(
      {
        studentIds: classItem.enrolledStudentIds || [],
        teacherIds: classItem.teacherId ? [classItem.teacherId] : [],
      },
      {
        title,
        body,
        data: {
          type: 'schedule',
          url: '/(tabs)/schedule',
          classId: params.classId,
        },
      }
    );
  } catch (err) {
    console.error('Failed to notify schedule update:', err);
  }
}

