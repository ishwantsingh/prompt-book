import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/lib/activity-service'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

// PUT /api/user/activity/mark-all-read - Mark all user activities as read
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const markedCount = await ActivityService.markAllActivitiesAsRead(userId)

    return NextResponse.json({ 
      success: true, 
      data: { markedCount } 
    })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error marking all activities as read:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to mark all activities as read' },
      { status: 500 }
    )
  }
}
