import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/lib/activity-service'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
import { ActivityWithActor } from '@/types/activity'

// GET /api/user/activity - Get user's content-related activities
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') || undefined

    const result = await ActivityService.getUserActivities({
      userId,
      limit,
      offset,
      unreadOnly,
      type: type as any
    })

    // Transform activities to match frontend interface
    const transformedActivities = result.activities.map((activity: any) => ({
      id: activity.id,
      userId: activity.userId,
      userName: activity.actor.displayName || activity.actor.username,
      userAvatar: activity.actor.avatarUrl || '/avatars/default.jpg',
      type: activity.type,
      title: activity.title,
      description: activity.description,
      data: activity.data,
      createdAt: activity.createdAt,
      isRead: activity.isRead
    }))

    return NextResponse.json({
      success: true,
      activities: transformedActivities,
      hasMore: result.hasMore,
      unreadCount: result.unreadCount,
      total: result.total
    })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching activity feed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity feed' },
      { status: 500 }
    )
  }
}

// POST /api/user/activity - Create new activity (for system use)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const body = await request.json()
    const { type, title, description, data, actorId } = body

    if (!type || !title || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const effectiveActorId = actorId || userId
    if (effectiveActorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot create activities for another actor' },
        { status: 403 }
      )
    }

    const activity = await ActivityService.createActivity({
      userId,
      actorId: effectiveActorId,
      type,
      title,
      description,
      data: data || {}
    })

    if (!activity) {
      return NextResponse.json(
        { success: false, error: 'Failed to create activity' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: activity })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error creating activity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}
