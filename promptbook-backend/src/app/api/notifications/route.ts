import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

// Mock notification data for demo purposes
const mockNotifications = [
  {
    id: '1',
    userId: 'demo-user',
    type: 'comment',
    title: 'New comment on your prompt',
    message: 'John Doe commented on "Customer Service Email Templates"',
    data: { promptId: '1', commentId: '5' },
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '2',
    userId: 'demo-user',
    type: 'follow',
    title: 'New follower',
    message: 'Sarah Wilson started following you',
    data: { followerId: 'user-2' },
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },
  {
    id: '3',
    userId: 'demo-user',
    type: 'vote',
    title: 'Your prompt received votes',
    message: 'Your prompt "Code Review Guidelines" received 5 new upvotes',
    data: { promptId: '3', voteCount: 5 },
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  },
  {
    id: '4',
    userId: 'demo-user',
    type: 'reply',
    title: 'Reply to your comment',
    message: 'Alex Chen replied to your comment on "Marketing Copy Templates"',
    data: { promptId: '2', commentId: '8', replyId: '12' },
    read: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },
];

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const { searchParams } = new URL(request.url);
    const userId = user.userId;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Filter notifications for the user
    let notifications = mockNotifications.filter(n => n.userId === userId);

    // Filter for unread only if requested
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    // Sort by most recent first
    notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    notifications = notifications.slice(0, limit);

    const unreadCount = mockNotifications.filter(n => n.userId === userId && !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
      total: mockNotifications.filter(n => n.userId === userId).length
    });

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create new notification (for system use)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const notification = await request.json();
    
    // In a real implementation, this would save to database
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      userId: user.userId,
      read: false,
      createdAt: new Date(),
    };

    // Add to mock data
    mockNotifications.unshift(newNotification);

    return NextResponse.json({ success: true, notification: newNotification });

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
