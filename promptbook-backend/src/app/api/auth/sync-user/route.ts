import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuthenticatedUser(request)
    const body = await request.json()
    const { username, displayName, avatarUrl } = body

    // Check if user already exists
    let dbUser = await db.user.findUnique({
      where: { id: authUser.userId }
    })

    if (dbUser) {
      // Update existing user with latest OAuth data
      dbUser = await db.user.update({
        where: { id: authUser.userId },
        data: {
          email: authUser.email,
          username: username || authUser.email.split('@')[0],
          displayName: displayName || 'Anonymous User',
          avatarUrl: avatarUrl || null,
          updatedAt: new Date(),
        }
      })
    } else {
      // Create new user
      dbUser = await db.user.create({
        data: {
          id: authUser.userId,
          email: authUser.email,
          username: username || authUser.email.split('@')[0],
          displayName: displayName || 'Anonymous User',
          avatarUrl: avatarUrl || null,
          reputationScore: 0, // Start with 0 reputation
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        displayName: dbUser.displayName,
        avatarUrl: dbUser.avatarUrl,
        reputationScore: dbUser.reputationScore,
        created:
          !dbUser.updatedAt ||
          dbUser.createdAt.getTime() === dbUser.updatedAt.getTime()
      }
    })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error syncing user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
