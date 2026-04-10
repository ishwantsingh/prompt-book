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

    // Get stored vote counts from prompts table (much more performant)
    const prompts = await db.prompt.findMany({
      where: { id: { in: promptIds } },
      select: { id: true, upvotes: true, downvotes: true }
    })

    let userVotes: { promptId: string; voteType: string }[] = []
    if (userId) {
      userVotes = await db.vote.findMany({
        where: { userId, promptId: { in: promptIds } },
        select: { promptId: true, voteType: true }
      })
    }

    const data: Record<string, { userVote: string | null; upvotes: number; downvotes: number }> = {}
    promptIds.forEach(promptId => {
      const prompt = prompts.find(p => p.id === promptId)
      const userVote = userVotes.find(v => v.promptId === promptId)?.voteType || null
      data[promptId] = { 
        userVote, 
        upvotes: prompt?.upvotes || 0, 
        downvotes: prompt?.downvotes || 0 
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching votes data:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch votes data' }, { status: 500 })
  }
}
