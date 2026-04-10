import { PrismaClient, Prompt } from '@prisma/client'
import { tagRepository, PromptTagData } from '../repositories/tagRepository'
import { backgroundScoringService } from './backgroundScoringService'

const prisma = new PrismaClient()

export interface CreatePromptData {
  title: string
  content: string
  description?: string
  authorId: string
  categoryId: string
  subcategoryId?: string | null


  tags?: string[] // Array of tag slugs or names
  isFeatured?: boolean
  slug?: string // Optional custom slug, will auto-generate if not provided
}

export interface UpdatePromptData {
  title?: string
  content?: string
  description?: string
  categoryId?: string
  subcategoryId?: string | null


  tags?: string[] // Array of tag slugs or names
  isFeatured?: boolean
  slug?: string // Optional custom slug, will auto-generate if not provided
}

export interface PromptWithTags extends Prompt {
  tags: Array<{
    tag: {
      id: string
      name: string
      slug: string
      kind: string
    }
    isPrimary: boolean
    source: string
  }>
}

export class PromptService {
  /**
   * Generate a slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }

  /**
   * Generate a unique slug, appending numbers if needed
   */
  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = this.generateSlug(title)
    let slug = baseSlug
    let counter = 1

    while (true) {
      const existing = await prisma.prompt.findFirst({
        where: {
          slug,
          ...(excludeId && { id: { not: excludeId } })
        }
      })

      if (!existing) {
        break
      }

      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  /**
   * Create a new prompt with normalized tags
   */
  async createPrompt(data: CreatePromptData): Promise<PromptWithTags> {
    // Validate subcategoryId belongs to the provided categoryId when present
    const subcategoryIdToUse: string | null | undefined = data.subcategoryId
    if (subcategoryIdToUse) {
      const subcat = await prisma.subcategory.findUnique({ where: { id: subcategoryIdToUse } })
      if (!subcat) throw new Error('Invalid subcategoryId')
      if (subcat.categoryId !== data.categoryId) {
        throw new Error('subcategoryId does not belong to the given categoryId')
      }
    }

    // Generate slug if not provided
    const slug = data.slug || await this.generateUniqueSlug(data.title)

    // Create the prompt first
    const createData = {
      title: data.title,
      slug,
      content: data.content,
      description: data.description,
      authorId: data.authorId,
      categoryId: data.categoryId,

      isFeatured: data.isFeatured || false,
      isSeed: false, // New prompts are not seed data
      ...(subcategoryIdToUse && { subcategoryId: subcategoryIdToUse })
    }
    const prompt = await prisma.prompt.create({ data: createData })

    // Process tags if provided
    if (data.tags && data.tags.length > 0) {
      await this.processPromptTags(prompt.id, data.tags)
    }

    // Queue prompt for automatic scoring (non-blocking)
    backgroundScoringService.queuePromptForScoring(prompt.id, 'rule_based', 'normal')
      .catch(error => {
        console.error(`Failed to queue prompt ${prompt.id} for scoring:`, error)
      })

    // Return prompt with tags
    return this.getPromptWithTags(prompt.id)
  }

  /**
   * Update an existing prompt with normalized tags
   */
  async updatePrompt(promptId: string, data: UpdatePromptData): Promise<PromptWithTags> {
    // Update prompt fields
    const updateData: Record<string, unknown> = {}

    // When category might change, load current prompt
    let currentCategoryId: string | undefined
    if (data.categoryId !== undefined) {
      const existing = await prisma.prompt.findUnique({
        where: { id: promptId },
        select: { categoryId: true }
      })
      if (!existing) throw new Error(`Prompt with id ${promptId} not found`)
      currentCategoryId = existing.categoryId
    }

    // Compute the effective categoryId that subcategory must match
    const effectiveCategoryId = data.categoryId ?? currentCategoryId

    // Only include fields that are provided and not tags
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.description !== undefined) updateData.description = data.description
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId

    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured
    
    // Handle slug updates
    if (data.slug !== undefined) {
      updateData.slug = data.slug
    } else if (data.title !== undefined) {
      // Auto-generate slug if title changed but slug not provided
      updateData.slug = await this.generateUniqueSlug(data.title, promptId)
    }

    // Handle subcategory validation/update
    if (data.subcategoryId !== undefined) {
      if (data.subcategoryId === null || data.subcategoryId === '') {
        (updateData as Record<string, unknown>).subcategoryId = null
      } else {
        if (!effectiveCategoryId) {
          throw new Error('Cannot set subcategory without a known category')
        }
        const subcat = await prisma.subcategory.findUnique({ where: { id: data.subcategoryId } })
        if (!subcat) throw new Error('Invalid subcategoryId')
        if (subcat.categoryId !== effectiveCategoryId) {
          throw new Error('subcategoryId does not belong to the prompt\'s category')
        }
        (updateData as Record<string, unknown>).subcategoryId = data.subcategoryId
      }
    } else if (data.categoryId !== undefined && data.categoryId !== currentCategoryId) {
      // Category changed: clear subcategory to avoid mismatches
      (updateData as Record<string, unknown>).subcategoryId = null
    }

    await prisma.prompt.update({
      where: { id: promptId },
      data: updateData
    })

    // Process tags if provided
    if (data.tags) {
      await this.processPromptTags(promptId, data.tags)
    }

    // Queue prompt for re-scoring if content changed (non-blocking)
    if (data.content !== undefined || data.title !== undefined) {
      backgroundScoringService.queuePromptForScoring(promptId, 'rule_based', 'normal')
        .catch(error => {
          console.error(`Failed to queue prompt ${promptId} for re-scoring:`, error)
        })
    }

    // Return prompt with tags
    return this.getPromptWithTags(promptId)
  }

  /**
   * Get prompt with normalized tags
   */
  async getPromptWithTags(promptId: string): Promise<PromptWithTags> {
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
                kind: true
              }
            }
          },
          orderBy: [
            { isPrimary: 'desc' },
            { tag: { name: 'asc' } }
          ]
        }
      }
    })

    if (!prompt) {
      throw new Error(`Prompt with id ${promptId} not found`)
    }

    return prompt as PromptWithTags
  }

  /**
   * Process and normalize tags for a prompt
   */
  private async processPromptTags(promptId: string, tagIdentifiers: string[]): Promise<void> {
    const promptTagData: PromptTagData[] = []

    for (let i = 0; i < tagIdentifiers.length; i++) {
      const identifier = tagIdentifiers[i].trim()
      if (!identifier) continue

      // Try to find existing tag
      let tag = await tagRepository.findTag(identifier)

      if (!tag) {
        // Create new tag if it doesn't exist
        tag = await tagRepository.createTag({
          name: identifier,
          kind: 'topic' // Default to topic, can be enhanced with NLP later
        })
      }

      promptTagData.push({
        promptId,
        tagId: tag.id,
        isPrimary: i === 0, // First tag is primary
        source: 'manual'
      })
    }

    // Update prompt tags
    if (promptTagData.length > 0) {
      await tagRepository.updatePromptTags(promptId, promptTagData)
    }
  }

  /**
   * Get prompts by tag
   */
  async getPromptsByTag(tagSlug: string, limit = 20): Promise<Prompt[]> {
    const tag = await tagRepository.findTag(tagSlug)
    if (!tag) {
      throw new Error(`Tag '${tagSlug}' not found`)
    }

    const promptTags = await prisma.promptTag.findMany({
      where: { tagId: tag.id },
      include: { prompt: true },
      orderBy: { prompt: { createdAt: 'desc' } },
      take: limit
    })

    return promptTags.map((pt: { prompt: Prompt }) => pt.prompt)
  }

  /**
   * Get prompts by multiple tags (AND logic)
   */
  async getPromptsByTags(tagSlugs: string[], limit = 20): Promise<Prompt[]> {
    const tags = await Promise.all(
      tagSlugs.map(slug => tagRepository.findTag(slug))
    )

    const validTags = tags.filter((tag): tag is NonNullable<typeof tag> => tag !== null)
    if (validTags.length === 0) {
      return []
    }

    // Find prompts that have ALL the specified tags
    const promptIds = await prisma.$queryRaw<string[]>`
      SELECT pt."promptId"
      FROM prompt_tags pt
      WHERE pt."tagId" = ANY(${validTags.map(t => t.id)})
      GROUP BY pt."promptId"
      HAVING COUNT(DISTINCT pt."tagId") = ${validTags.length}
      ORDER BY MAX(pt."createdAt") DESC
      LIMIT ${limit}
    `

    if (promptIds.length === 0) {
      return []
    }

    return prisma.prompt.findMany({
      where: { id: { in: promptIds } },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Search prompts with tag filtering
   */
  async searchPrompts(query: string, tagFilters?: string[], limit = 20): Promise<Prompt[]> {
    const whereClause: Record<string, unknown> = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    }

    // If tag filters are provided, we need to use a more complex query
    if (tagFilters && tagFilters.length > 0) {
      const tags = await Promise.all(
        tagFilters.map(slug => tagRepository.findTag(slug))
      )

      const validTagIds = tags.filter((tag): tag is NonNullable<typeof tag> => tag !== null).map(tag => tag.id)

      if (validTagIds.length > 0) {
        // This is a simplified approach - in production you might want to use
        // a more sophisticated search with proper ranking
        const promptIds = await prisma.$queryRaw<string[]>`
          SELECT pt."promptId"
          FROM prompt_tags pt
          WHERE pt."tagId" = ANY(${validTagIds})
          GROUP BY pt."promptId"
          HAVING COUNT(DISTINCT pt."tagId") = ${validTagIds.length}
        `

        if (promptIds.length > 0) {
          whereClause.id = { in: promptIds }
        } else {
          // No prompts match the tag criteria
          return []
        }
      }
    }

    return prisma.prompt.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Delete a prompt and its associated tags
   */
  async deletePrompt(promptId: string): Promise<void> {
    // Tags will be automatically deleted due to CASCADE
    await prisma.prompt.delete({
      where: { id: promptId }
    })
  }
}

// Export singleton instance
export const promptService = new PromptService()
