import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
import { promptService } from '@/services/promptService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') as
      | 'topic'
      | 'audience'
      | 'tone'
      | 'format'
      | 'industry'
      | 'language'
      | null
    const slugsParam = searchParams.get('slugs')
    const slugs = slugsParam ? slugsParam.split(',').map(s => s.trim()).filter(Boolean) : []
    const subcategoryId = searchParams.get('subcategoryId')
    const categoryId = searchParams.get('categoryId')
    const q = searchParams.get('q')?.trim() || ''
    const sort = (searchParams.get('sort') || 'recent').toLowerCase()

    // Build optional tag facet filter (all slugs must be present when provided)
    const whereClause: Record<string, unknown> = {}
    if (kind && slugs.length > 0) {
      whereClause.AND = slugs.map(slug => ({
        tags: { some: { tag: { slug, kind } } }
      }))
    } else if (kind) {
      whereClause.tags = { some: { tag: { kind } } }
    } else if (slugs.length > 0) {
      whereClause.AND = slugs.map(slug => ({
        tags: { some: { tag: { slug } } }
      }))
    }

    // Optional category/subcategory filter
    if (subcategoryId) {
      ;(whereClause as any).subcategoryId = subcategoryId
    }
    if (categoryId) {
      ;(whereClause as any).categoryId = categoryId
    }

    // Basic full-text search
    if (q) {
      ;(whereClause as any).OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ]
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' }
    if (sort === 'popular' || sort === 'top') {
      orderBy = [ { upvotes: 'desc' }, { bestScore: 'desc' }, { createdAt: 'desc' } ]
    } else if (sort === 'score') {
      orderBy = [ { bestScore: 'desc' }, { createdAt: 'desc' } ]
    } else if (sort === 'recent' || sort === 'new') {
      orderBy = { createdAt: 'desc' }
    }

    const prompts = await db.prompt.findMany({
      where: whereClause,
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
      orderBy
    })
    return NextResponse.json({ success: true, data: prompts })
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch prompts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const body = await request.json()
    const { title, description, prompt: content, categoryId, subcategoryId, tags } = body
    if (!title || !description || !content || !categoryId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const newPrompt = await promptService.createPrompt({
      title: String(title).trim(),
      description: String(description).trim(),
      content: String(content).trim(),
      authorId: userId,
      categoryId,
      tags: tags || [],
      subcategoryId: subcategoryId ?? null,
      isFeatured: false
    })

    // Get the complete prompt with all relationships
    const promptWithUseCases = await db.prompt.findUnique({
      where: { id: newPrompt.id },
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
    })

    return NextResponse.json({ success: true, data: promptWithUseCases })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error creating prompt:', error)
    return NextResponse.json({ success: false, error: 'Failed to create prompt' }, { status: 500 })
  }
}
