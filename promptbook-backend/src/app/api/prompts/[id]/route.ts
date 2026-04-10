import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'
type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: identifier } = await params
    
    // Try to find by slug first, then by ID (for backward compatibility)
    const prompt: any = await db.prompt.findFirst({
      where: {
        OR: [
          { slug: identifier },
          { id: identifier }
        ]
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
      }
    })

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt not found' }, { status: 404 })
    }

    const transformedPrompt = {
      id: prompt.id,
      slug: prompt.slug,
      title: prompt.title,
      description: prompt.description,
      prompt: prompt.content,
      category: { id: prompt.category.id, name: prompt.category.name },
      subcategory: prompt.subcategory ? { id: prompt.subcategory.id, name: prompt.subcategory.name, slug: prompt.subcategory.slug } : null,
      author: prompt.author,
      upvotes: prompt.upvotes,
      downvotes: prompt.downvotes,
      bestScore: prompt.bestScore,
      createdAt: prompt.createdAt.toISOString(),
      primaryTag: (prompt.tags.find((pt: any) => pt.isPrimary) ? {
        id: (prompt.tags.find((pt: any) => pt.isPrimary) as any).tag.id,
        name: (prompt.tags.find((pt: any) => pt.isPrimary) as any).tag.name,
        slug: (prompt.tags.find((pt: any) => pt.isPrimary) as any).tag.slug,
        kind: (prompt.tags.find((pt: any) => pt.isPrimary) as any).tag.kind
      } : null),
      tags: prompt.tags.map((pt: any) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
        kind: pt.tag.kind,
        isPrimary: pt.isPrimary
      }))
    }

    return NextResponse.json({ success: true, data: transformedPrompt })
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch prompt' }, { status: 500 })
  }
}
