import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const commentIds = searchParams.get('commentIds')?.split(',') || []
    if (commentIds.length === 0) {
      return NextResponse.json({ success: true, data: {} })
    }
    
    // Get stored vote counts from comments table (much more performant)
    const comments = await db.comment.findMany({
      where: { id: { in: commentIds } },
      select: { id: true, upvotes: true, downvotes: true }
    })
    
    const data: Record<string, { upvotes: number; downvotes: number }> = {}
    commentIds.forEach(id => {
      const comment = comments.find(c => c.id === id)
      data[id] = { 
        upvotes: comment?.upvotes || 0, 
        downvotes: comment?.downvotes || 0 
      }
    })
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching comment vote data:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch comment vote data' }, { status: 500 })
  }
}

