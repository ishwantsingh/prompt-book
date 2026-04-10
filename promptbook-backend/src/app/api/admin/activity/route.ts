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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch all recent activity in parallel for better performance
    const [recentPrompts, recentUsers, recentComments, recentVotes] = await Promise.all([
      db.prompt.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true, displayName: true } }
        }
      }),
      
      db.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { username: true, displayName: true, createdAt: true }
      }),
      
      db.comment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { username: true, displayName: true } },
          prompt: { select: { title: true } }
        }
      }),
      
      db.vote.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true, displayName: true } },
          prompt: { select: { title: true } }
        }
      })
    ])

    // Combine and sort all activities by creation time
    const activities = [
      ...recentPrompts.map(prompt => ({
        type: 'prompt',
        icon: '📝',
        title: `New prompt created: "${prompt.title}"`,
        subtitle: `by ${prompt.author.displayName || prompt.author.username}`,
        timestamp: prompt.createdAt,
        data: prompt
      })),
      ...recentUsers.map(user => ({
        type: 'user',
        icon: '👤',
        title: `New user registered: ${user.displayName || user.username}`,
        subtitle: '',
        timestamp: user.createdAt,
        data: user
      })),
      ...recentComments.map(comment => ({
        type: 'comment',
        icon: '💬',
        title: `New comment on "${comment.prompt.title}"`,
        subtitle: `by ${comment.author.displayName || comment.author.username}`,
        timestamp: comment.createdAt,
        data: comment
      })),
      ...recentVotes.map(vote => ({
        type: 'vote',
        icon: vote.voteType === 'upvote' ? '👍' : '👎',
        title: `${vote.voteType === 'upvote' ? 'Upvote' : 'Downvote'} on "${vote.prompt.title}"`,
        subtitle: `by ${vote.user.displayName || vote.user.username}`,
        timestamp: vote.createdAt,
        data: vote
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: activities
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching admin activity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}
