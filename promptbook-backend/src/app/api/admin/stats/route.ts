import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthErrorResponse,
  requireAdminUser,
} from '@/lib/request-auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request)

    // Fetch real-time statistics
    const [
      totalPrompts,
      totalUsers,
      totalVotes,
      totalComments
    ] = await Promise.all([
      db.prompt.count(),
      db.user.count(),
      db.vote.count(),
      db.comment.count()
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalPrompts,
        totalUsers,
        totalVotes,
        totalComments
      }
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
