// Frontend API response types (no Prisma needed)
export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl?: string
  reputationScore: number
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
}

export interface Subcategory {
  id: string
  name: string
  slug: string
  description?: string
  categoryId: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  kind: 'topic' | 'audience' | 'tone' | 'format' | 'industry' | 'language'
}

export interface Prompt {
  id: string
  slug: string
  title: string
  content: string
  description?: string
  upvotes: number
  downvotes: number
  bestScore?: number
  createdAt: string
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  category: Pick<Category, 'id' | 'name' | 'slug'>
  subcategory?: Pick<Subcategory, 'id' | 'name' | 'slug'>
  tags: Array<{
    tag: Pick<Tag, 'id' | 'name' | 'slug' | 'kind'>
    isPrimary: boolean
  }>
}

export interface Comment {
  id: string
  content: string
  upvotes: number
  downvotes: number
  createdAt: string
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>
  replies?: Comment[]
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Team-related API types
export interface TeamApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

export interface TeamFilters {
  type?: 'user' | 'public' | 'all'
  search?: string
  limit?: number
  offset?: number
}

export interface TeamCollectionFilters {
  search?: string
  teamId?: string
}
