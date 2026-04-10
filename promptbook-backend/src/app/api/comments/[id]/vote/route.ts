import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  authenticateRequest,
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
import { z } from 'zod'

const voteSchema = z.object({ voteType: z.enum(['upvote', 'downvote']) })
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await authenticateRequest(request)
    const userId = user?.userId || null
    const { id: commentId } = await params
    
    // Get stored vote counts from comment table (much more performant)
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { upvotes: true, downvotes: true }
    })
    
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 })
    }
    
    let userVote = null as string | null
    if (userId) {
      const existingVote = await db.commentVote.findUnique({ 
        where: { userId_commentId: { userId, commentId } } 
      })
      userVote = existingVote?.voteType || null
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        userVote, 
        upvotes: comment.upvotes, 
        downvotes: comment.downvotes 
      } 
    })
  } catch (error) {
    console.error('Error fetching comment vote data:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch comment vote data' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId
    
    const { id: commentId } = await params
    const body = await request.json()
    const { voteType } = voteSchema.parse(body)
    
    const comment = await db.comment.findUnique({ 
      where: { id: commentId }, 
      select: { id: true } 
    })
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 })
    }
    
    const existingVote = await db.commentVote.findUnique({ 
      where: { userId_commentId: { userId, commentId } } 
    })
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Remove vote
        await db.commentVote.delete({ 
          where: { userId_commentId: { userId, commentId } } 
        })
      } else {
        // Change vote type
        await db.commentVote.update({ 
          where: { userId_commentId: { userId, commentId } }, 
          data: { voteType } 
        })
      }
    } else {
      // Create new vote
      await db.commentVote.create({ data: { userId, commentId, voteType } })
    }
    
    // Recalculate and update stored counts (similar to prompt votes)
    const voteCounts = await db.commentVote.groupBy({
      by: ['voteType'],
      where: { commentId },
      _count: { voteType: true }
    })
    const upvotes = voteCounts.find(v => v.voteType === 'upvote')?._count.voteType || 0
    const downvotes = voteCounts.find(v => v.voteType === 'downvote')?._count.voteType || 0
    
    // Update the stored counts in the Comment model
    await db.comment.update({
      where: { id: commentId },
      data: { upvotes, downvotes }
    })
    
    const currentUserVote = await db.commentVote.findUnique({ 
      where: { userId_commentId: { userId, commentId } } 
    })
    
    return NextResponse.json({
      success: true,
      data: { 
        voteType: currentUserVote?.voteType || null, 
        upvotes, 
        downvotes 
      }
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
    console.error('Error recording comment vote:', error)
    return NextResponse.json({ success: false, error: 'Failed to record comment vote' }, { status: 500 })
  }
}
