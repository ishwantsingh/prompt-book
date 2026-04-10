import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: userId } = await params

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Fetch user's published prompts with real-time vote counts
    const userPrompts = await db.prompt.findMany({
      where: { 
        authorId: userId,
        status: 'published'
      },
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
    console.error('Error fetching user prompts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch user prompts' }, { status: 500 })
  }
}
