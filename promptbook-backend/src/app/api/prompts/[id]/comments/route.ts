import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
import { z } from 'zod'
import { ActivityService } from '@/lib/activity-service'

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional()
})
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: promptId } = await params
    const comments = await db.comment.findMany({
      where: { promptId, parentId: null },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        replies: {
          include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, data: comments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 })
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
    const { content, parentId } = createCommentSchema.parse(body)

    const prompt = await db.prompt.findUnique({ 
      where: { id: promptId }, 
      select: { id: true, authorId: true, title: true } 
    })
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt not found' }, { status: 404 })
    }
    let parentComment = null
    if (parentId) {
      parentComment = await db.comment.findUnique({
        where: { id: parentId },
        select: { id: true, promptId: true, authorId: true }
      })
      if (!parentComment || parentComment.promptId !== promptId) {
        return NextResponse.json({ success: false, error: 'Parent comment not found' }, { status: 404 })
      }
    }

    const comment = await db.comment.create({
      data: { content, promptId, authorId: userId, parentId: parentId || null },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }
    })

    // Create activity for prompt owner (if commenting on a prompt)
    if (!parentId && prompt.authorId !== userId) {
      try {
        await ActivityService.createCommentActivity({
          userId: prompt.authorId,
          actorId: userId,
          promptId: promptId,
          commentId: comment.id,
          promptTitle: prompt.title,
          commentContent: content
        })
      } catch (error) {
        console.error('Error creating comment activity:', error)
        // Don't fail the comment creation if activity fails
      }
    }

    // Create activity for parent comment author (if replying to a comment)
    if (parentId && parentComment && parentComment.authorId !== userId) {
      try {
        await ActivityService.createReplyActivity({
          userId: parentComment.authorId,
          actorId: userId,
          promptId: promptId,
          parentCommentId: parentId,
          replyId: comment.id,
          promptTitle: prompt.title,
          replyContent: content
        })
      } catch (error) {
        console.error('Error creating reply activity:', error)
        // Don't fail the comment creation if activity fails
      }
    }

    return NextResponse.json({ success: true, data: comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid comment data', details: error.errors },
        { status: 400 }
      )
    }
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }
    console.error('Error creating comment:', error)
    return NextResponse.json({ success: false, error: 'Failed to create comment' }, { status: 500 })
  }
}
