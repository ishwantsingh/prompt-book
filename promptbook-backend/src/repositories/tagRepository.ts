import { PrismaClient, Tag, TagKind, TagSource } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateTagData {
  name: string
  slug?: string
  kind?: TagKind
  aliases?: string[]
}

export interface TagWithAliases extends Tag {
  aliases: { name: string }[]
}

export interface PromptTagData {
  promptId: string
  tagId: string
  isPrimary?: boolean
  source?: TagSource
}

export class TagRepository {
  /**
   * Create a new tag with optional aliases
   */
  async createTag(data: CreateTagData): Promise<Tag> {
    const slug = data.slug || this.generateSlug(data.name)

    // Check if tag already exists (case-insensitive)
    const existingTag = await prisma.tag.findFirst({
      where: {
        OR: [
          { slug: { equals: slug, mode: 'insensitive' } },
          { name: { equals: data.name, mode: 'insensitive' } }
        ]
      }
    })

    if (existingTag) {
      return existingTag
    }

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        slug,
        kind: data.kind || 'topic'
      }
    })

    // Create aliases if provided
    if (data.aliases && data.aliases.length > 0) {
      await Promise.all(
        data.aliases.map(alias =>
          prisma.tagAlias.create({
            data: {
              name: alias,
              tagId: tag.id
            }
          })
        )
      )
    }

    return tag
  }

  /**
   * Find tag by slug, name, or alias
   */
  async findTag(identifier: string): Promise<Tag | null> {
    return prisma.tag.findFirst({
      where: {
        OR: [
          { slug: { equals: identifier, mode: 'insensitive' } },
          { name: { equals: identifier, mode: 'insensitive' } },
          { aliases: { some: { name: { equals: identifier, mode: 'insensitive' } } } }
        ]
      }
    })
  }

  /**
   * Find or create tag (useful for normalization)
   */
  async findOrCreateTag(data: CreateTagData): Promise<Tag> {
    const existingTag = await this.findTag(data.name)
    if (existingTag) {
      return existingTag
    }

    return this.createTag(data)
  }

  /**
   * Get tags by kind
   */
  async getTagsByKind(kind: TagKind): Promise<Tag[]> {
    return prisma.tag.findMany({
      where: { kind, isDeprecated: false },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Search tags by query
   */
  async searchTags(query: string, limit = 10): Promise<Tag[]> {
    return prisma.tag.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { aliases: { some: { name: { contains: query, mode: 'insensitive' } } } }
        ],
        isDeprecated: false
      },
      take: limit,
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get tags for a specific prompt
   */
  async getPromptTags(promptId: string): Promise<Tag[]> {
    const promptTags = await prisma.promptTag.findMany({
      where: { promptId },
      include: { tag: true },
      orderBy: [
        { isPrimary: 'desc' },
        { tag: { name: 'asc' } }
      ]
    })

    return promptTags.map(pt => pt.tag)
  }

  /**
   * Add tags to a prompt
   */
  async addTagsToPrompt(promptId: string, tagData: PromptTagData[]): Promise<void> {
    // Create prompt-tag relationships
    await Promise.all(
      tagData.map(td =>
        prisma.promptTag.create({
          data: {
            promptId,
            tagId: td.tagId,
            isPrimary: td.isPrimary || false,
            source: td.source || 'manual'
          }
        })
      )
    )
  }

  /**
   * Remove tags from a prompt
   */
  async removeTagsFromPrompt(promptId: string, tagIds: string[]): Promise<void> {
    await prisma.promptTag.deleteMany({
      where: {
        promptId,
        tagId: { in: tagIds }
      }
    })
  }

  /**
   * Update prompt tags (replace all existing tags)
   */
  async updatePromptTags(promptId: string, tagData: PromptTagData[]): Promise<void> {
    // Remove existing tags
    await prisma.promptTag.deleteMany({
      where: { promptId }
    })

    // Add new tags
    if (tagData.length > 0) {
      await this.addTagsToPrompt(promptId, tagData)
    }
  }

  /**
   * Get popular tags (by usage count)
   */
  async getPopularTags(limit = 20): Promise<Array<Tag & { usageCount: number }>> {
    const result = await prisma.$queryRaw<Array<Tag & { usageCount: number }>>`
      SELECT t.*, COUNT(pt."promptId") as "usageCount"
      FROM tags t
      LEFT JOIN prompt_tags pt ON t.id = pt."tagId"
      WHERE t."isDeprecated" = false
      GROUP BY t.id
      ORDER BY "usageCount" DESC, t.name ASC
      LIMIT ${limit}
    `

    return result
  }

  /**
   * Deprecate a tag (soft delete)
   */
  async deprecateTag(tagId: string): Promise<Tag> {
    return prisma.tag.update({
      where: { id: tagId },
      data: { isDeprecated: true }
    })
  }

  /**
   * Merge tags (move all relationships from source to target)
   */
  async mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
    // Update all prompt-tag relationships
    await prisma.promptTag.updateMany({
      where: { tagId: sourceTagId },
      data: { tagId: targetTagId }
    })

    // Move aliases
    await prisma.tagAlias.updateMany({
      where: { tagId: sourceTagId },
      data: { tagId: targetTagId }
    })

    // Deprecate source tag
    await this.deprecateTag(sourceTagId)
  }

  /**
   * Generate a slug from a tag name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
  }
}

// Export singleton instance
export const tagRepository = new TagRepository()
