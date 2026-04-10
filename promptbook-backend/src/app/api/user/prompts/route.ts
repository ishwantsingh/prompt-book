import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const userPrompts = await db.prompt.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        description: true,
        upvotes: true,
        downvotes: true,
        bestScore: true,
        createdAt: true,
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        tags: {
          include: {
            tag: { select: { id: true, name: true, slug: true, kind: true } }
          },
          orderBy: [
            { isPrimary: 'desc' },
            { tag: { name: 'asc' } }
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: userPrompts })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching user prompts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch user prompts' }, { status: 500 })
  }
}
