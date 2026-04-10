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

    const favorites = await db.userFavorite.findMany({
      where: { userId },
      include: {
        prompt: {
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
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const savedPrompts = favorites.map(favorite => ({
      id: favorite.prompt.id,
      slug: favorite.prompt.slug,
      title: favorite.prompt.title,
      description: favorite.prompt.description,
      prompt: favorite.prompt.content,
      category: { id: favorite.prompt.category.id, name: favorite.prompt.category.name },
      author: { id: favorite.prompt.author.id, username: favorite.prompt.author.username, displayName: favorite.prompt.author.displayName },
      upvotes: favorite.prompt.upvotes,
      downvotes: favorite.prompt.downvotes,
      bestScore: favorite.prompt.bestScore,
      createdAt: favorite.prompt.createdAt.toISOString(),
      savedAt: favorite.createdAt.toISOString(),
      subcategory: favorite.prompt.subcategory ? { id: favorite.prompt.subcategory.id, name: favorite.prompt.subcategory.name, slug: favorite.prompt.subcategory.slug } : null,
      tags: favorite.prompt.tags?.map((pt: any) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
        kind: pt.tag.kind,
        isPrimary: pt.isPrimary
      })) || []
    }))

    return NextResponse.json({ success: true, data: savedPrompts })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching saved prompts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch saved prompts' }, { status: 500 })
  }
}
