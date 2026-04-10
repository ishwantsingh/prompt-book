import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthErrorResponse,
  requireAdminUser,
} from '@/lib/request-auth'
import { backgroundScoringService } from '@/services/backgroundScoringService'

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser(request)

    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'score_unscored':
        await backgroundScoringService.scoreUnscoredPrompts(params.source)
        return NextResponse.json({
          message: 'Unscored prompts queued for scoring',
          action: 'score_unscored'
        })

      case 'rescore_low_quality':
        const threshold = params.threshold || 40
        await backgroundScoringService.rescoreLowQualityPrompts(threshold, params.source)
        return NextResponse.json({
          message: `Low-quality prompts (score < ${threshold}) queued for re-scoring`,
          action: 'rescore_low_quality',
          threshold
        })

      case 'score_batch':
        const { promptIds } = params
        if (!Array.isArray(promptIds) || promptIds.length === 0) {
          return NextResponse.json(
            { error: 'promptIds must be a non-empty array' },
            { status: 400 }
          )
        }
        await backgroundScoringService.scorePromptsBatch(promptIds, params.source)
        return NextResponse.json({
          message: `${promptIds.length} prompts queued for scoring`,
          action: 'score_batch',
          count: promptIds.length
        })

      case 'cleanup':
        await backgroundScoringService.cleanupOldScores()
        return NextResponse.json({
          message: 'Score cleanup completed',
          action: 'cleanup'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: score_unscored, rescore_low_quality, score_batch, cleanup' },
          { status: 400 }
        )
    }

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error in admin scoring operation:', error)
    return NextResponse.json(
      { error: 'Failed to execute scoring operation' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser(request)

    const stats = await backgroundScoringService.getScoringStats()
    
    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error getting scoring stats:', error)
    return NextResponse.json(
      { error: 'Failed to get scoring statistics' },
      { status: 500 }
    )
  }
}
