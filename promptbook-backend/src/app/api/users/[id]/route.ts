import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ id: string }> }

// GET /api/users/[id] - Get public user profile data
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: userId } = await params

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    // Fetch user data with public information only
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        reputationScore: true,
        createdAt: true,
        // Don't include email or other private info
        _count: {
          select: {
            prompts: {
              where: { status: 'published' } // Only count published prompts
            },
            votes: true,
            comments: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Calculate additional stats
    const userPrompts = await db.prompt.findMany({
      where: { 
        authorId: userId,
        status: 'published'
      },
      select: {
        id: true,
        bestScore: true,
        upvotes: true,
        downvotes: true
      }
    })

    // Use stored vote counts for much better performance
    const totalUpvotes = userPrompts.reduce((sum, prompt) => sum + (prompt.upvotes || 0), 0)
    const totalDownvotes = userPrompts.reduce((sum, prompt) => sum + (prompt.downvotes || 0), 0)
    const avgScore = userPrompts.length > 0 
      ? Math.round(userPrompts.reduce((sum, prompt) => sum + (prompt.bestScore || 0), 0) / userPrompts.length)
      : 0

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        stats: {
          promptsCount: user._count.prompts,
          totalUpvotes,
          totalDownvotes,
          avgScore,
          commentsCount: user._count.comments
        }
      }
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch user profile' }, { status: 500 })
  }
}
