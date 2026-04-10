import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/lib/activity-service'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string }> }

// PUT /api/user/activity/[id]/read - Mark activity as read
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: activityId } = await params

    const success = await ActivityService.markActivityAsRead(activityId, userId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Activity not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error marking activity as read:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark activity as read' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/activity/[id]/read - Mark activity as unread
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: activityId } = await params

    const success = await ActivityService.markActivityAsUnread(activityId, userId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Activity not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error marking activity as unread:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark activity as unread' },
      { status: 500 }
    )
  }
}
