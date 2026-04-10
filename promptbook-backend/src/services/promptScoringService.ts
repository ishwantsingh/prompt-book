import { PrismaClient, PromptScore } from '@prisma/client'

const prisma = new PrismaClient()

export interface ScoringRubric {
  clarityStructure: number        // 0-20
  specificityContext: number      // 0-20
  adaptabilityReusability: number // 0-15
  efficiency: number              // 0-15
  creativityOriginality: number   // 0-10
  biasSafety: number              // 0-10
  goalAlignment: number           // 0-10
}

export interface ScoringResult {
  rubric: ScoringRubric
  finalScore: number
  source: 'rule_based' | 'llm' | 'manual'
}

export type ScoreBand = 'excellent' | 'strong' | 'average' | 'weak' | 'poor'

export class PromptScoringService {
  /**
   * Calculate the final score from rubric dimensions
   */
  private calculateFinalScore(rubric: ScoringRubric): number {
    return (
      rubric.clarityStructure +
      rubric.specificityContext +
      rubric.adaptabilityReusability +
      rubric.efficiency +
      rubric.creativityOriginality +
      rubric.biasSafety +
      rubric.goalAlignment
    )
  }

  /**
   * Get score band based on final score
   */
  getScoreBand(score: number): ScoreBand {
    if (score >= 90) return 'excellent'
    if (score >= 75) return 'strong'
    if (score >= 60) return 'average'
    if (score >= 40) return 'weak'
    return 'poor'
  }

  /**
   * Rule-based scoring algorithm based on the provided rubric
   */
  async scorePromptRuleBased(promptId: string): Promise<ScoringResult> {
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    })

    if (!prompt) {
      throw new Error(`Prompt with id ${promptId} not found`)
    }

    const rubric = this.analyzePromptWithRules(prompt)
    const finalScore = this.calculateFinalScore(rubric)

    return {
      rubric,
      finalScore,
      source: 'rule_based'
    }
  }

  /**
   * Analyze prompt content using rule-based heuristics
   */
  private analyzePromptWithRules(prompt: any): ScoringRubric {
    const content = prompt.content.toLowerCase()
    const title = prompt.title.toLowerCase()
    const description = prompt.description?.toLowerCase() || ''
    const fullText = `${title} ${content} ${description}`

    // Check for garbage content first
    if (this.isGarbageContent(content, title)) {
      return this.getGarbageScore()
    }

    return {
      clarityStructure: this.scoreClarityStructure(content, title),
      specificityContext: this.scoreSpecificityContext(fullText),
      adaptabilityReusability: this.scoreAdaptabilityReusability(content),
      efficiency: this.scoreEfficiency(content),
      creativityOriginality: this.scoreCreativityOriginality(content),
      biasSafety: this.scoreBiasSafety(content),
      goalAlignment: this.scoreGoalAlignment(content, prompt.tags)
    }
  }

  /**
   * Check if content is garbage or gibberish
   */
  private isGarbageContent(content: string, title: string): boolean {
    const text = `${title} ${content}`.toLowerCase()
    
    // Check for extremely short content (less than 10 characters total)
    if (text.trim().length < 10) return true
    
    // Check for repeated characters (like "aaaaaaa" or "1111111")
    if (/(.)\1{6,}/.test(text)) return true
    
    // Check for excessive repeated words (like "test test test test test")
    const textWords = text.split(/\s+/).filter(word => word.length > 0)
    if (textWords.length > 0) {
      const wordCounts = new Map<string, number>()
      for (const word of textWords) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
      const maxRepeats = Math.max(...wordCounts.values())
      if (maxRepeats > textWords.length * 0.4) return true
    }
    
    // Check for actual keyboard mashing patterns (improved algorithm)
    if (this.detectKeyboardMashing(text)) return true
    
    // Check for excessive special characters (more than 60% special chars)
    const specialCharRatio = (text.match(/[^a-z0-9\s]/g) || []).length / text.length
    if (specialCharRatio > 0.6) return true
    
    // Check for nonsense words (words with no vowels and reasonable length)
    const words = text.split(/\s+/).filter(word => word.length > 0)
    if (words.length > 0) {
      const nonsenseWords = words.filter(word => 
        word.length > 4 && 
        !/[aeiou]/.test(word) && // No vowels
        word.length < 15 &&
        !/http|www|com|org|net|edu|gov/i.test(word) // Exclude URLs
      )
      if (nonsenseWords.length > words.length * 0.4) return true
    }
    
    // Check for excessive numbers without context (more than 50% numbers)
    const numberRatio = (text.match(/\d+/g) || []).length / Math.max(words.length, 1)
    if (numberRatio > 0.5 && !/step|number|count|amount|quantity|version|year|date/i.test(text)) return true
    
    // Check for content that's mostly punctuation or symbols
    const punctuationRatio = (text.match(/[^\w\s]/g) || []).length / text.length
    if (punctuationRatio > 0.7) return true
    
    return false
  }

  /**
   * Improved keyboard mashing detection that avoids false positives
   */
  private detectKeyboardMashing(text: string): boolean {
    const words = text.split(/\s+/).filter(word => word.length > 0)
    
    // Common legitimate technical terms that might contain keyboard sequences
    const legitimateTerms = new Set([
      'prioritize', 'prioritization', 'prioritizing', 'prioritized',
      'qwerty',
      'keyboard', 'typing', 'typewriter', 'layout',
      'sequence', 'sequential', 'sequencing',
      'pattern', 'patterns', 'patterning',
      'repetition', 'repetitive', 'repeating',
      'analysis', 'analyze', 'analyzing', 'analytical',
      'visualization', 'visualize', 'visualizing',
      'optimization', 'optimize', 'optimizing',
      'organization', 'organize', 'organizing',
      'documentation', 'document', 'documenting',
      'implementation', 'implement', 'implementing',
      'configuration', 'configure', 'configuring',
      'authentication', 'authenticate', 'authenticating',
      'authorization', 'authorize', 'authorizing',
      'initialization', 'initialize', 'initializing',
      'specialization', 'specialize', 'specializing',
      'categorization', 'categorize', 'categorizing',
      'characterization', 'characterize', 'characterizing',
      'customization', 'customize', 'customizing',
      'standardization', 'standardize', 'standardizing',
      'utilization', 'utilize', 'utilizing',
      'maximization', 'maximize', 'maximizing',
      'minimization', 'minimize', 'minimizing',
      'optimization', 'optimize', 'optimizing',
      'development', 'developing', 'developed',
      'programming', 'programmer', 'programmed',
      'functionality', 'functional', 'functioning',
      'performance', 'performing', 'performed',
      'management', 'managing', 'managed',
      'processing', 'processor', 'processed',
      'computing', 'computer', 'computed',
      'engineering', 'engineer', 'engineered',
      'technology', 'technological', 'technically',
      'application', 'applications', 'applying',
      'integration', 'integrating', 'integrated',
      'automation', 'automating', 'automated',
      'collaboration', 'collaborating', 'collaborated',
      'communication', 'communicating', 'communicated',
      'administration', 'administrating', 'administered',
      'coordination', 'coordinating', 'coordinated',
      'evaluation', 'evaluating', 'evaluated',
      'investigation', 'investigating', 'investigated',
      'modification', 'modifying', 'modified',
      'specification', 'specifying', 'specified',
      'verification', 'verifying', 'verified',
      'validation', 'validating', 'validated',
      'transformation', 'transforming', 'transformed',
      'interpretation', 'interpreting', 'interpreted',
      'presentation', 'presenting', 'presented',
      'representation', 'representing', 'represented',
      'implementation', 'implementing', 'implemented',
      'experimentation', 'experimenting', 'experimented',
      'documentation', 'documenting', 'documented',
      'visualization', 'visualizing', 'visualized',
      'optimization', 'optimizing', 'optimized',
      'organization', 'organizing', 'organized',
      'specialization', 'specializing', 'specialized',
      'categorization', 'categorizing', 'categorized',
      'characterization', 'characterizing', 'characterized',
      'customization', 'customizing', 'customized',
      'standardization', 'standardizing', 'standardized',
      'utilization', 'utilizing', 'utilized',
      'maximization', 'maximizing', 'maximized',
      'minimization', 'minimizing', 'minimized'
    ])
    
    let keyboardMashingCount = 0
    let totalWords = words.length
    
    for (const word of words) {
      // Skip very short words
      if (word.length < 8) continue
      
      // Skip if it's a legitimate technical term
      if (legitimateTerms.has(word.toLowerCase().replace(/[^a-z]/g, ''))) continue
      
      // Check for consecutive keyboard sequences (more than 7 consecutive chars from same row)
      const hasLongQwertySequence = /[qwertyuiop]{8,}/.test(word)
      const hasLongAsdfSequence = /[asdfghjkl]{8,}/.test(word)
      const hasLongZxcvSequence = /[zxcvbnm]{8,}/.test(word)
      
      // Check for multiple consecutive sequences in the same word
      const qwertySequences = (word.match(/[qwertyuiop]{4,}/g) || []).length
      const asdfSequences = (word.match(/[asdfghjkl]{4,}/g) || []).length
      const zxcvSequences = (word.match(/[zxcvbnm]{4,}/g) || []).length
      
      // Check for exact keyboard mashing patterns (like "qwertyuiop", "asdfghjkl", "zxcvbnm")
      const isExactKeyboardPattern = /^(qwertyuiop|asdfghjkl|zxcvbnm)$/.test(word)
      
      // Flag as potential keyboard mashing if:
      // 1. Has a very long consecutive sequence (8+ chars) from same row, OR
      // 2. Has multiple consecutive sequences (3+ sequences of 4+ chars each), OR
      // 3. Is an exact keyboard mashing pattern
      if (hasLongQwertySequence || hasLongAsdfSequence || hasLongZxcvSequence || 
          (qwertySequences + asdfSequences + zxcvSequences) >= 3 || isExactKeyboardPattern) {
        keyboardMashingCount++
      }
    }
    
    // Consider it keyboard mashing if more than 15% of words show keyboard patterns
    // and we have at least 3 such words (to avoid false positives on short texts)
    return keyboardMashingCount >= 3 && (keyboardMashingCount / totalWords) > 0.15
  }

  /**
   * Return a very low score for garbage content
   */
  private getGarbageScore(): ScoringRubric {
    return {
      clarityStructure: 1,
      specificityContext: 1,
      adaptabilityReusability: 1,
      efficiency: 1,
      creativityOriginality: 1,
      biasSafety: 5, // Still give some safety points
      goalAlignment: 1
    }
  }

  /**
   * Score clarity and structure (0-20)
   */
  private scoreClarityStructure(content: string, title: string): number {
    let score = 5 // Base score (reverted to old system)

    // Check for clear structure indicators
    const hasNumberedSteps = /\d+\.|\d+\)|step \d+/i.test(content)
    const hasBulletPoints = /^[\s]*[-*•]\s/m.test(content)
    const hasHeaders = /^[\s]*#{1,6}\s/m.test(content)
    const hasFormatting = /\*\*|__|`|```/i.test(content)

    if (hasNumberedSteps) score += 4
    if (hasBulletPoints) score += 3
    if (hasHeaders) score += 3
    if (hasFormatting) score += 2

    // Check for clear instructions
    const hasInstructions = /please|you should|make sure|ensure|follow/i.test(content)
    if (hasInstructions) score += 2

    // Check for examples
    const hasExamples = /example|for instance|such as|like this/i.test(content)
    if (hasExamples) score += 1

    // Enhanced: Check for logical flow indicators
    const hasLogicalFlow = /first|then|next|finally|after|before|when|if|unless/i.test(content)
    if (hasLogicalFlow) score += 1

    // Enhanced: Check for clear question format
    const hasQuestionFormat = /\?.*\?|what|how|why|when|where|which/i.test(content)
    if (hasQuestionFormat) score += 1

    return Math.min(20, Math.max(0, score))
  }

  /**
   * Score specificity and context (0-20)
   */
  private scoreSpecificityContext(fullText: string): number {
    let score = 5 // Base score (reverted to old system)

    // Check for role definition
    const hasRole = /you are|act as|role of|as a|be a/i.test(fullText)
    if (hasRole) score += 4

    // Check for specific constraints
    const hasConstraints = /limit|maximum|minimum|exactly|only|must not|avoid/i.test(fullText)
    if (hasConstraints) score += 3

    // Check for context setting
    const hasContext = /context|background|situation|scenario|given that/i.test(fullText)
    if (hasContext) score += 3

    // Check for specific output format
    const hasOutputFormat = /format|structure|output|return|provide|give me/i.test(fullText)
    if (hasOutputFormat) score += 2

    // Check for specific metrics or criteria
    const hasMetrics = /\d+%|\d+ words|\d+ sentences|\d+ characters|length|count/i.test(fullText)
    if (hasMetrics) score += 2

    // Check for examples or references
    const hasReferences = /example|sample|reference|like|similar to/i.test(fullText)
    if (hasReferences) score += 1

    // Enhanced: Check for domain-specific terms
    const hasDomainTerms = /technical|professional|business|academic|creative|scientific/i.test(fullText)
    if (hasDomainTerms) score += 1

    // Enhanced: Check for target audience specification
    const hasAudience = /for|target|audience|users|readers|beginners|experts|professionals/i.test(fullText)
    if (hasAudience) score += 1

    return Math.min(20, Math.max(0, score))
  }

  /**
   * Score adaptability and reusability (0-15)
   */
  private scoreAdaptabilityReusability(content: string): number {
    let score = 5 // Base score (reverted to old system)

    // Check for generic language
    const hasGenericTerms = /any|various|different|multiple|general|common/i.test(content)
    if (hasGenericTerms) score += 3

    // Check for variable placeholders
    const hasPlaceholders = /\[.*\]|{.*}|<.*>|___|placeholder/i.test(content)
    if (hasPlaceholders) score += 3

    // Check for flexible instructions
    const hasFlexibility = /adapt|modify|adjust|customize|change|vary/i.test(content)
    if (hasFlexibility) score += 2

    // Check for domain-agnostic language
    const hasDomainAgnostic = /regardless|independent|universal|general/i.test(content)
    if (hasDomainAgnostic) score += 2

    // Enhanced: Check for template-like language
    const hasTemplateLanguage = /template|framework|structure|outline|format/i.test(content)
    if (hasTemplateLanguage) score += 1

    // Enhanced: Check for reusable patterns
    const hasReusablePatterns = /repeat|reuse|apply|use this|follow this/i.test(content)
    if (hasReusablePatterns) score += 1

    return Math.min(15, Math.max(0, score))
  }

  /**
   * Score efficiency (0-15) - Improved to be more fair to shorter prompts
   */
  private scoreEfficiency(content: string): number {
    const wordCount = content.split(/\s+/).length
    let score = 5 // Base score (reverted to old system)

    // More nuanced length scoring - less punitive for short prompts
    if (wordCount > 500) score -= 3 // Still penalize excessive verbosity
    else if (wordCount > 300) score -= 1 // Slight penalty for very long
    else if (wordCount < 20) score -= 2 // Only penalize extremely short
    else if (wordCount < 50) score -= 1 // Light penalty for short
    else if (wordCount >= 50 && wordCount <= 200) score += 1 // Reward optimal length

    // Check for concise language
    const hasConciseLanguage = /brief|concise|short|succinct|direct/i.test(content)
    if (hasConciseLanguage) score += 2

    // Check for redundant phrases
    const hasRedundancy = /in order to|due to the fact that|it is important to note that/i.test(content)
    if (hasRedundancy) score -= 2

    // Check for clear, direct instructions
    const hasDirectInstructions = /do|create|generate|write|make/i.test(content)
    if (hasDirectInstructions) score += 1

    // Enhanced: Check for action verbs (efficiency indicator)
    const hasActionVerbs = /analyze|build|design|develop|implement|optimize|solve|create/i.test(content)
    if (hasActionVerbs) score += 1

    // Enhanced: Check for time/effort indicators
    const hasTimeIndicators = /quick|fast|efficient|streamlined|optimized|minimal/i.test(content)
    if (hasTimeIndicators) score += 1

    // Enhanced: Check for unnecessary words (penalty)
    const hasUnnecessaryWords = /very|really|quite|rather|somewhat|kind of|sort of/i.test(content)
    if (hasUnnecessaryWords) score -= 1

    return Math.min(15, Math.max(0, score))
  }

  /**
   * Score creativity and originality (0-10)
   */
  private scoreCreativityOriginality(content: string): number {
    let score = 3 // Base score (reverted to old system)

    // Check for creative language
    const hasCreativeLanguage = /imagine|envision|craft|weave|paint|sculpt/i.test(content)
    if (hasCreativeLanguage) score += 2

    // Check for unique approaches
    const hasUniqueApproaches = /unconventional|novel|innovative|creative|original/i.test(content)
    if (hasUniqueApproaches) score += 2

    // Check for metaphorical language
    const hasMetaphors = /like a|as if|metaphor|analogy|similar to/i.test(content)
    if (hasMetaphors) score += 1

    // Check for engaging language
    const hasEngagingLanguage = /captivating|compelling|intriguing|fascinating/i.test(content)
    if (hasEngagingLanguage) score += 1

    // Check for generic boilerplate (penalty)
    const hasBoilerplate = /please help me|i need help|can you|would you/i.test(content)
    if (hasBoilerplate) score -= 1

    // Enhanced: Check for storytelling elements
    const hasStorytelling = /story|narrative|character|plot|scene|setting/i.test(content)
    if (hasStorytelling) score += 1

    // Enhanced: Check for artistic/creative domains
    const hasCreativeDomains = /art|design|music|poetry|writing|creative|artistic/i.test(content)
    if (hasCreativeDomains) score += 1

    return Math.min(10, Math.max(0, score))
  }

  /**
   * Score bias and safety (0-10)
   */
  private scoreBiasSafety(content: string): number {
    let score = 7 // Base score (reverted to old system)

    // Check for potentially biased language
    const hasBiasedLanguage = /always|never|all|none|everyone|nobody|best|worst/i.test(content)
    if (hasBiasedLanguage) score -= 1

    // Check for inclusive language
    const hasInclusiveLanguage = /inclusive|diverse|various|different perspectives/i.test(content)
    if (hasInclusiveLanguage) score += 1

    // Check for neutral tone
    const hasNeutralTone = /objective|neutral|balanced|fair|unbiased/i.test(content)
    if (hasNeutralTone) score += 1

    // Check for potentially harmful content
    const hasHarmfulContent = /hate|discriminate|exclude|offensive|inappropriate/i.test(content)
    if (hasHarmfulContent) score -= 3

    // Enhanced: Check for respectful language
    const hasRespectfulLanguage = /respectful|considerate|thoughtful|appropriate/i.test(content)
    if (hasRespectfulLanguage) score += 1

    // Enhanced: Check for ethical considerations
    const hasEthicalConsiderations = /ethical|responsible|privacy|confidential|secure/i.test(content)
    if (hasEthicalConsiderations) score += 1

    return Math.min(10, Math.max(0, score))
  }

  /**
   * Score goal alignment (0-10)
   */
  private scoreGoalAlignment(content: string, tags: any[]): number {
    let score = 5 // Base score (reverted to old system)

    // Check for clear objectives
    const hasObjectives = /goal|objective|purpose|aim|target|achieve/i.test(content)
    if (hasObjectives) score += 2

    // Check for measurable outcomes
    const hasMeasurableOutcomes = /result|output|deliverable|produce|create|generate/i.test(content)
    if (hasMeasurableOutcomes) score += 2

    // Check for success criteria
    const hasSuccessCriteria = /success|quality|standard|criteria|requirement/i.test(content)
    if (hasSuccessCriteria) score += 1

    // Bonus for having relevant tags
    if (tags && tags.length > 0) score += 1

    // Enhanced: Check for problem-solving language
    const hasProblemSolving = /solve|fix|improve|enhance|optimize|resolve/i.test(content)
    if (hasProblemSolving) score += 1

    // Enhanced: Check for task-oriented language
    const hasTaskOriented = /task|assignment|project|work|job|duty/i.test(content)
    if (hasTaskOriented) score += 1

    return Math.min(10, Math.max(0, score))
  }

  /**
   * Save scoring result to database
   */
  async saveScore(promptId: string, result: ScoringResult): Promise<PromptScore> {
    const score = await prisma.promptScore.create({
      data: {
        promptId,
        source: result.source,
        clarityStructure: result.rubric.clarityStructure,
        specificityContext: result.rubric.specificityContext,
        adaptabilityReusability: result.rubric.adaptabilityReusability,
        efficiency: result.rubric.efficiency,
        creativityOriginality: result.rubric.creativityOriginality,
        biasSafety: result.rubric.biasSafety,
        goalAlignment: result.rubric.goalAlignment,
        finalScore: result.finalScore
      }
    })

    // Update prompt with best score if this is better
    await this.updatePromptBestScore(promptId, result.finalScore, result.source)

    return score
  }

  /**
   * Update prompt's denormalized best score
   */
  private async updatePromptBestScore(promptId: string, newScore: number, source: string): Promise<void> {
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: { bestScore: true, bestScoreSource: true }
    })

    if (!prompt) return

    // Update if no best score exists or new score is better
    if (prompt.bestScore === null || newScore > prompt.bestScore) {
      await prisma.prompt.update({
        where: { id: promptId },
        data: {
          bestScore: newScore,
          bestScoreSource: source
        }
      })
    }
  }

  /**
   * Get scoring history for a prompt
   */
  async getPromptScores(promptId: string, limit = 10): Promise<PromptScore[]> {
    return prisma.promptScore.findMany({
      where: { promptId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Get best score for a prompt
   */
  async getPromptBestScore(promptId: string): Promise<PromptScore | null> {
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: { bestScore: true, bestScoreSource: true }
    })

    if (!prompt || prompt.bestScore === null) return null

    // Find the score record that matches the best score
    return prisma.promptScore.findFirst({
      where: {
        promptId,
        finalScore: prompt.bestScore,
        source: prompt.bestScoreSource || undefined
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Score a prompt and save the result
   */
  async scoreAndSavePrompt(promptId: string, source: 'rule_based' | 'llm' | 'manual' = 'rule_based'): Promise<ScoringResult> {
    let result: ScoringResult

    if (source === 'rule_based') {
      result = await this.scorePromptRuleBased(promptId)
    } else {
      throw new Error(`Scoring source '${source}' not yet implemented`)
    }

    await this.saveScore(promptId, result)
    return result
  }
}

// Export singleton instance
export const promptScoringService = new PromptScoringService()
