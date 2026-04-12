import { db } from '@/lib/db'

const prisma = db

export class CategoryService {
  async getCategoryWithSubcategories(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        color: true,
        subcategories: {
          select: { id: true, name: true, slug: true, description: true },
          orderBy: { name: 'asc' }
        }
      }
    })
    return category
  }
}

export const categoryService = new CategoryService()

