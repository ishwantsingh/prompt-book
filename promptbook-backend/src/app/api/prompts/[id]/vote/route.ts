import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import {
  authenticateRequest,
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
import { z } from 'zod'
import { ActivityService } from '@/lib/activity-service'

const voteSchema = z.object({ voteType: z.enum(['upvote', 'downvote']) })
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await authenticateRequest(request)
    const userId = user?.userId || null
    const { id: promptId } = await params

    // Get stored vote counts from prompt table (much more performant)
    const prompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { upvotes: true, downvotes: true }
    })

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt not found' }, { status: 404 })
    }

    let userVote = null as string | null
    if (userId) {
      const existingVote = await db.vote.findUnique({
        where: { userId_promptId: { userId, promptId } }
      })
      userVote = existingVote?.voteType || null
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        userVote, 
        upvotes: prompt.upvotes, 
        downvotes: prompt.downvotes 
      } 
    })
  } catch (error) {
    console.error('Error fetching vote data:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch vote data' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: promptId } = await params
    const body = await request.json()
    const { voteType } = voteSchema.parse(body)

    const prompt = await db.prompt.findUnique({ 
      where: { id: promptId }, 
      select: { id: true, authorId: true, title: true } 
    })
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt not found' }, { status: 404 })
    }

    const existingVote = await db.vote.findUnique({
      where: { userId_promptId: { userId, promptId } }
    })

    let voteAction = 'none'
    let finalVoteType = null

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote
        await db.vote.delete({ where: { userId_promptId: { userId, promptId } } })
        voteAction = 'removed'
      } else {
        // Change vote type
        await db.vote.update({ where: { userId_promptId: { userId, promptId } }, data: { voteType } })
        voteAction = 'changed'
        finalVoteType = voteType
      }
    } else {
      // Create new vote
      await db.vote.create({ data: { userId, promptId, voteType } })
      voteAction = 'created'
      finalVoteType = voteType
    }

    const voteCounts = await db.vote.groupBy({
      by: ['voteType'],
      where: { promptId },
      _count: { voteType: true }
    })
    const upvotes = voteCounts.find(v => v.voteType === 'upvote')?._count.voteType || 0
    const downvotes = voteCounts.find(v => v.voteType === 'downvote')?._count.voteType || 0

    // Update the stored counts in the Prompt model
    await db.prompt.update({
      where: { id: promptId },
      data: { upvotes, downvotes }
    })

    const currentUserVote = await db.vote.findUnique({ where: { userId_promptId: { userId, promptId } } })

    // Create activity for prompt owner when someone votes (but not when removing votes)
    if (prompt.authorId !== userId && finalVoteType && (voteAction === 'created' || voteAction === 'changed')) {
      try {
        await ActivityService.createVoteActivity({
          userId: prompt.authorId,
          actorId: userId,
          promptId: promptId,
          promptTitle: prompt.title,
          voteType: finalVoteType as 'upvote' | 'downvote',
          newVoteCount: finalVoteType === 'upvote' ? upvotes : downvotes
        })
      } catch (error) {
        console.error('Error creating vote activity:', error)
        // Don't fail the vote if activity fails
      }
    }

    return NextResponse.json({
      success: true,
      data: { voteType: currentUserVote?.voteType || null, upvotes, downvotes }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid vote data', details: error.errors },
        { status: 400 }
      )
    }
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }
    console.error('Error recording vote:', error)
    return NextResponse.json({ success: false, error: 'Failed to record vote' }, { status: 500 })
  }
}
