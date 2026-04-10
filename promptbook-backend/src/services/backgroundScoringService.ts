import { promptScoringService, ScoringResult } from './promptScoringService'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface ScoringJob {
  id: string
  promptId: string
  source: 'rule_based' | 'llm' | 'manual'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  completedAt?: Date
  error?: string
  result?: ScoringResult
}

export class BackgroundScoringService {
  private processingQueue: Set<string> = new Set()
  private maxConcurrentJobs = 5

  /**
   * Queue a prompt for scoring (non-blocking)
   */
  async queuePromptForScoring(
    promptId: string, 
    source: 'rule_based' | 'llm' | 'manual' = 'rule_based',
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    // Check if prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: { id: true }
    })

    if (!prompt) {
      throw new Error(`Prompt with id ${promptId} not found`)
    }

    // Check if already in queue or recently scored
    if (this.processingQueue.has(promptId)) {
      console.log(`Prompt ${promptId} is already being processed`)
      return
    }

    // Check if recently scored (within last hour for rule-based)
    if (source === 'rule_based') {
      const recentScore = await prisma.promptScore.findFirst({
        where: {
          promptId,
          source: 'rule_based',
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        }
      })

      if (recentScore) {
        console.log(`Prompt ${promptId} was recently scored, skipping`)
        return
      }
    }

    // Process immediately if queue is not full, otherwise defer
    if (this.processingQueue.size < this.maxConcurrentJobs) {
      this.processScoringJob(promptId, source, priority)
    } else {
      // In a real implementation, you'd add this to a persistent queue
      console.log(`Queue full, deferring scoring for prompt ${promptId}`)
      // For now, we'll process it anyway but log the delay
      setTimeout(() => {
        this.processScoringJob(promptId, source, priority)
      }, 1000)
    }
  }

  /**
   * Process a scoring job
   */
  private async processScoringJob(
    promptId: string, 
    source: 'rule_based' | 'llm' | 'manual',
    priority: 'high' | 'normal' | 'low'
  ): Promise<void> {
    this.processingQueue.add(promptId)

    try {
      console.log(`Starting scoring for prompt ${promptId} with ${source} method`)
      
      const result = await promptScoringService.scoreAndSavePrompt(promptId, source)
      
      console.log(`Completed scoring for prompt ${promptId}: ${result.finalScore} (${promptScoringService.getScoreBand(result.finalScore)})`)
      
    } catch (error) {
      console.error(`Failed to score prompt ${promptId}:`, error)
      
      // Log error to database for monitoring
      await this.logScoringError(promptId, source, error as Error)
      
    } finally {
      this.processingQueue.delete(promptId)
    }
  }

  /**
   * Log scoring errors for monitoring
   */
  private async logScoringError(promptId: string, source: string, error: Error): Promise<void> {
    try {
      // In a production system, you might want to store this in a separate error log table
      console.error(`Scoring error for prompt ${promptId} (${source}):`, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    } catch (logError) {
      console.error('Failed to log scoring error:', logError)
    }
  }

  /**
   * Score multiple prompts in batch
   */
  async scorePromptsBatch(
    promptIds: string[], 
    source: 'rule_based' | 'llm' | 'manual' = 'rule_based'
  ): Promise<void> {
    console.log(`Queuing ${promptIds.length} prompts for scoring`)
    
    const promises = promptIds.map(promptId => 
      this.queuePromptForScoring(promptId, source, 'normal')
    )

    await Promise.allSettled(promises)
  }

  /**
   * Score all unscored prompts
   */
  async scoreUnscoredPrompts(source: 'rule_based' | 'llm' | 'manual' = 'rule_based'): Promise<void> {
    console.log('Finding unscored prompts...')
    
    // Find prompts that don't have any scores
    const unscoredPrompts = await prisma.prompt.findMany({
      where: {
        scores: {
          none: {}
        },
        status: 'published' // Only score published prompts
      },
      select: { id: true },
      take: 100 // Limit to avoid overwhelming the system
    })

    if (unscoredPrompts.length === 0) {
      console.log('No unscored prompts found')
      return
    }

    console.log(`Found ${unscoredPrompts.length} unscored prompts`)
    
    const promptIds = unscoredPrompts.map(p => p.id)
    await this.scorePromptsBatch(promptIds, source)
  }

  /**
   * Re-score prompts with low scores
   */
  async rescoreLowQualityPrompts(
    threshold: number = 40,
    source: 'rule_based' | 'llm' | 'manual' = 'rule_based'
  ): Promise<void> {
    console.log(`Finding prompts with scores below ${threshold}...`)
    
    const lowScorePrompts = await prisma.prompt.findMany({
      where: {
        bestScore: {
          lt: threshold
        },
        status: 'published'
      },
      select: { id: true },
      take: 50 // Limit to avoid overwhelming the system
    })

    if (lowScorePrompts.length === 0) {
      console.log(`No prompts found with scores below ${threshold}`)
      return
    }

    console.log(`Found ${lowScorePrompts.length} low-quality prompts to re-score`)
    
    const promptIds = lowScorePrompts.map(p => p.id)
    await this.scorePromptsBatch(promptIds, source)
  }

  /**
   * Get scoring statistics
   */
  async getScoringStats(): Promise<{
    totalPrompts: number
    scoredPrompts: number
    unscoredPrompts: number
    averageScore: number
    scoreDistribution: Record<string, number>
    processingQueue: number
  }> {
    const [totalPrompts, scoredPrompts, scoreStats] = await Promise.all([
      prisma.prompt.count({ where: { status: 'published' } }),
      prisma.prompt.count({ 
        where: { 
          status: 'published',
          bestScore: { not: null }
        } 
      }),
      prisma.promptScore.groupBy({
        by: ['source'],
        _count: { source: true },
        _avg: { finalScore: true }
      })
    ])

    const unscoredPrompts = totalPrompts - scoredPrompts

    // Calculate score distribution
    const scoreDistribution = await prisma.prompt.groupBy({
      by: ['bestScore'],
      where: {
        bestScore: { not: null },
        status: 'published'
      },
      _count: { bestScore: true }
    })

    const distribution: Record<string, number> = {
      excellent: 0,
      strong: 0,
      average: 0,
      weak: 0,
      poor: 0
    }

    scoreDistribution.forEach(group => {
      if (group.bestScore !== null) {
        const band = promptScoringService.getScoreBand(group.bestScore)
        distribution[band] += group._count.bestScore
      }
    })

    const averageScore = scoreStats.length > 0 
      ? scoreStats.reduce((sum, stat) => sum + (stat._avg.finalScore || 0), 0) / scoreStats.length
      : 0

    return {
      totalPrompts,
      scoredPrompts,
      unscoredPrompts,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution: distribution,
      processingQueue: this.processingQueue.size
    }
  }

  /**
   * Clean up old scoring records (keep only the best score per prompt)
   */
  async cleanupOldScores(): Promise<void> {
    console.log('Cleaning up old scoring records...')
    
    // This is a complex operation that should be done carefully
    // For now, we'll just log the intention
    console.log('Cleanup operation would remove old scores, keeping only the best score per prompt')
    
    // In a production system, you might want to:
    // 1. Archive old scores instead of deleting them
    // 2. Keep a certain number of recent scores
    // 3. Only clean up scores older than a certain date
  }
}

// Export singleton instance
export const backgroundScoringService = new BackgroundScoringService()
