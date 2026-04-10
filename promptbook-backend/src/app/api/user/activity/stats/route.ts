import { NextRequest, NextResponse } from 'next/server'
import { ActivityService } from '@/lib/activity-service'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// GET /api/user/activity/stats - Get activity statistics for user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const stats = await ActivityService.getActivityStats(userId)

    return NextResponse.json({ 
      success: true, 
      data: stats 
    })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching activity stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity stats' },
      { status: 500 }
    )
  }
}
