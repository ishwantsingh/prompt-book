import { NextRequest, NextResponse } from 'next/server'
import { backgroundScoringService } from '@/services/backgroundScoringService'
import { promptScoringService } from '@/services/promptScoringService'
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: promptId } = await params
    const body = await request.json()
    const { source = 'rule_based', priority = 'normal' } = body

    // Validate source
    if (!['rule_based', 'llm', 'manual'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be one of: rule_based, llm, manual' },
        { status: 400 }
      )
    }

    // Queue the prompt for scoring
    await backgroundScoringService.queuePromptForScoring(promptId, source, priority)

    return NextResponse.json({
      message: 'Prompt queued for scoring',
      promptId,
      source,
      priority
    })

  } catch (error) {
    console.error('Error queuing prompt for scoring:', error)
    return NextResponse.json(
      { error: 'Failed to queue prompt for scoring' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: promptId } = await params
    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'

    // Get the best score for the prompt
    const bestScore = await promptScoringService.getPromptBestScore(promptId)

    if (!bestScore) {
      return NextResponse.json({
        promptId,
        hasScore: false,
        message: 'No scores found for this prompt'
      })
    }

    const result = {
      promptId,
      hasScore: true,
      bestScore: {
        id: bestScore.id,
        source: bestScore.source,
        finalScore: bestScore.finalScore,
        scoreBand: promptScoringService.getScoreBand(bestScore.finalScore),
        rubric: {
          clarityStructure: bestScore.clarityStructure,
          specificityContext: bestScore.specificityContext,
          adaptabilityReusability: bestScore.adaptabilityReusability,
          efficiency: bestScore.efficiency,
          creativityOriginality: bestScore.creativityOriginality,
          biasSafety: bestScore.biasSafety,
          goalAlignment: bestScore.goalAlignment
        },
        createdAt: bestScore.createdAt
      }
    }

    // Include scoring history if requested
    if (includeHistory) {
      const history = await promptScoringService.getPromptScores(promptId, 10)
      return NextResponse.json({
        ...result,
        history: history.map(score => ({
          id: score.id,
          source: score.source,
          finalScore: score.finalScore,
          scoreBand: promptScoringService.getScoreBand(score.finalScore),
          createdAt: score.createdAt
        }))
      })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error getting prompt score:', error)
    return NextResponse.json(
      { error: 'Failed to get prompt score' },
      { status: 500 }
    )
  }
}
