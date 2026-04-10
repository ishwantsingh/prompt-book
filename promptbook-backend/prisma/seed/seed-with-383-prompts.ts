import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed with 383 prompts...')
  
  // Load exported data
  const exportedDataPath = path.join(__dirname, 'exported-prompts.json')
  const exportedData = JSON.parse(fs.readFileSync(exportedDataPath, 'utf8'))
  
  console.log(`📊 Loading ${exportedData.prompts.length} prompts, ${exportedData.tags.length} tags, ${exportedData.categories.length} categories, ${exportedData.subcategories.length} subcategories, ${exportedData.users.length} users`)
  
  // Clear existing data (in correct order to respect foreign keys)
  console.log('🧹 Clearing existing data...')
  await prisma.promptTag.deleteMany()
  await prisma.tagAlias.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.commentVote.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.vote.deleteMany()
  await prisma.userFavorite.deleteMany()
  await prisma.promptScore.deleteMany()
  await prisma.prompt.deleteMany()
  await prisma.subcategory.deleteMany()
  await prisma.category.deleteMany()
  await prisma.user.deleteMany()
  
  // Create users first
  console.log('👥 Creating users...')
  for (const user of exportedData.users) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        reputationScore: user.reputationScore,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt)
      }
    })
  }
  
  // Create categories
  console.log('📂 Creating categories...')
  for (const category of exportedData.categories) {
    await prisma.category.create({
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        color: category.color,
        createdAt: new Date(category.createdAt)
      }
    })
  }
  
  // Create subcategories
  console.log('📁 Creating subcategories...')
  for (const subcategory of exportedData.subcategories) {
    await prisma.subcategory.create({
      data: {
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        description: subcategory.description,
        categoryId: subcategory.categoryId,
        createdAt: new Date(subcategory.createdAt)
      }
    })
  }
  
  // Create tags
  console.log('🏷️ Creating tags...')
  for (const tag of exportedData.tags) {
    await prisma.tag.create({
      data: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        kind: tag.kind,
        isDeprecated: tag.isDeprecated,
        createdAt: new Date(tag.createdAt),
        updatedAt: new Date(tag.updatedAt)
      }
    })
  }
  
  // Create prompts
  console.log('📝 Creating prompts...')
  for (const prompt of exportedData.prompts) {
    await prisma.prompt.create({
      data: {
        id: prompt.id,
        title: prompt.title,
        slug: prompt.slug,
        content: prompt.content,
        description: prompt.description,
        authorId: prompt.authorId,
        categoryId: prompt.categoryId,
        subcategoryId: prompt.subcategoryId,
        upvotes: prompt.upvotes,
        downvotes: prompt.downvotes,
        usageCount: prompt.usageCount,
        bestScore: prompt.bestScore,
        bestScoreSource: prompt.bestScoreSource,
        status: prompt.status,
        isFeatured: prompt.isFeatured,
        isSeed: prompt.isSeed,
        createdAt: new Date(prompt.createdAt),
        updatedAt: new Date(prompt.updatedAt)
      }
    })
  }
  
  // Create prompt-tag relationships
  console.log('🔗 Creating prompt-tag relationships...')
  for (const prompt of exportedData.prompts) {
    for (const tagRelation of prompt.tags) {
      await prisma.promptTag.create({
        data: {
          promptId: prompt.id,
          tagId: tagRelation.tagId,
          isPrimary: tagRelation.isPrimary,
          source: tagRelation.source,
          createdAt: new Date()
        }
      })
    }
  }
  
  console.log('✅ Database seeded successfully with 383 prompts!')
  console.log(`📊 Created:`)
  console.log(`   - ${exportedData.categories.length} categories`)
  console.log(`   - ${exportedData.subcategories.length} subcategories`)
  console.log(`   - ${exportedData.users.length} users`)
  console.log(`   - ${exportedData.tags.length} tags`)
  console.log(`   - ${exportedData.prompts.length} prompts`)
  console.log(`   - All prompt-tag relationships`)
  
  console.log(`\n🔑 Users:`)
  for (const user of exportedData.users) {
    console.log(`   📧 ${user.email} (ID: ${user.id}) - ${user.displayName}`)
  }
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

