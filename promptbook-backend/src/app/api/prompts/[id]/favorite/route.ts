import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import { ActivityService } from '@/lib/activity-service'
import {
  authenticateRequest,
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId
    const { id: promptId } = await params
    const prompt = await db.prompt.findUnique({ 
      where: { id: promptId }, 
      select: { id: true, authorId: true, title: true } 
    })
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt not found' }, { status: 404 })
    }
    const existingFavorite = await db.userFavorite.findUnique({
      where: { userId_promptId: { userId, promptId } }
    })
    if (existingFavorite) {
      return NextResponse.json({ success: false, error: 'Prompt already in favorites' }, { status: 409 })
    }
    const favorite = await db.userFavorite.create({ data: { userId, promptId } })

    // Create activity for prompt owner when someone favorites their prompt
    if (prompt.authorId !== userId) {
      try {
        await ActivityService.createFavoriteActivity({
          userId: prompt.authorId,
          actorId: userId,
          promptId: promptId,
          promptTitle: prompt.title
        })
      } catch (error) {
        console.error('Error creating favorite activity:', error)
        // Don't fail the favorite if activity fails
      }
    }

    return NextResponse.json({ success: true, data: { ...favorite, isFavorite: true } })
  } catch (error) {
    console.error('Error adding to favorites:', error)
    return NextResponse.json({ success: false, error: 'Failed to add to favorites' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId
    const { id: promptId } = await params
    const existingFavorite = await db.userFavorite.findUnique({
      where: { userId_promptId: { userId, promptId } }
    })
    if (!existingFavorite) {
      return NextResponse.json({ success: false, error: 'Prompt not in favorites' }, { status: 404 })
    }
    await db.userFavorite.delete({ where: { userId_promptId: { userId, promptId } } })
    return NextResponse.json({ success: true, data: { promptId, userId, isFavorite: false } })
  } catch (error) {
    console.error('Error removing from favorites:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove from favorites' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await authenticateRequest(request)
    const userId = user?.userId || null
    const { id: promptId } = await params
    const [favorite, favoriteCount] = await Promise.all([
      userId
        ? db.userFavorite.findUnique({ where: { userId_promptId: { userId, promptId } } })
        : Promise.resolve(null),
      db.userFavorite.count({ where: { promptId } })
    ])
    return NextResponse.json({ success: true, data: { isFavorite: !!favorite, favoriteCount } })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error checking favorite status:', error)
    return NextResponse.json({ success: false, error: 'Failed to check favorite status' }, { status: 500 })
  }
}
