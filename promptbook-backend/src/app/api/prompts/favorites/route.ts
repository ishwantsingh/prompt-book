import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
import {
  authenticateRequest,
  getAuthErrorResponse,
} from '@/lib/request-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    const userId = user?.userId || null
    const { searchParams } = new URL(request.url)
    const promptIds = searchParams.get('promptIds')?.split(',') || []
    if (promptIds.length === 0) {
      return NextResponse.json({ success: true, data: {} })
    }

    if (!userId) {
      const data: Record<string, { isFavorite: boolean; favoriteCount: number }> = {}
      promptIds.forEach(id => { data[id] = { isFavorite: false, favoriteCount: 0 } })
      return NextResponse.json({ success: true, data })
    }

    const userFavorites = await db.userFavorite.findMany({
      where: { userId, promptId: { in: promptIds } },
      select: { promptId: true }
    })
    const favoriteCounts = await db.userFavorite.groupBy({
      by: ['promptId'],
      where: { promptId: { in: promptIds } },
      _count: { promptId: true }
    })
    const data: Record<string, { isFavorite: boolean; favoriteCount: number }> = {}
    promptIds.forEach(id => {
      const isFavorite = userFavorites.some(f => f.promptId === id)
      const favoriteCount = favoriteCounts.find(fc => fc.promptId === id)?._count?.promptId || 0
      data[id] = { isFavorite, favoriteCount }
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching favorites data:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch favorites data' }, { status: 500 })
  }
}
