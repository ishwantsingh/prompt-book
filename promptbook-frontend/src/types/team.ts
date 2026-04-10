export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  ownerId: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  members: TeamMember[]
  _count: {
    members: number
    collections: number
  }
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: string
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    email: string
  }
}

export interface TeamCollection {
  id: string
  teamId: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  team: {
    id: string
    name: string
    slug: string
  }
  prompts: TeamCollectionPrompt[]
  _count: {
    prompts: number
  }
}

export interface TeamCollectionPrompt {
  id: string
  teamCollectionId: string
  promptId: string
  addedAt: string
  addedBy: string
  prompt: {
    id: string
    title: string
    slug: string
    content: string
    description: string | null
    upvotes: number
    downvotes: number
    bestScore: number | null
    createdAt: string
    author: {
      id: string
      username: string
      displayName: string | null
      avatarUrl: string | null
    }
    category: {
      id: string
      name: string
      slug: string
    }
    subcategory: {
      id: string
      name: string
      slug: string
    } | null
    tags: Array<{
      isPrimary: boolean
      tag: {
        id: string
        name: string
        slug: string
        kind: string
      }
    }>
  }
}

// API Request/Response types
export interface CreateTeamRequest {
  name: string
  description?: string
  isPublic?: boolean
}

export interface UpdateTeamRequest {
  name?: string
  description?: string
  isPublic?: boolean
}

export interface CreateTeamCollectionRequest {
  name: string
  description?: string
  isPublic?: boolean
}

export interface UpdateTeamCollectionRequest {
  name?: string
  description?: string
  isPublic?: boolean
}

export interface AddMemberRequest {
  memberUserId: string
  role?: TeamRole
}

export interface UpdateMemberRoleRequest {
  role: TeamRole
}

export interface TeamApiResponse {
  success: boolean
  data?: Team | Team[] | TeamMember[] | TeamCollection | TeamCollection[]
  error?: string
  message?: string
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

// Form types
export interface TeamFormData {
  name: string
  description: string
  isPublic: boolean
}

export interface TeamCollectionFormData {
  name: string
  description: string
  isPublic: boolean
}

// Filter and search types
export interface TeamFilters {
  type: 'user' | 'public' | 'all'
  search?: string
  limit?: number
  offset?: number
}

export interface TeamCollectionFilters {
  search?: string
  teamId?: string
}

// Permission types
export interface TeamPermissions {
  canRead: boolean
  canUpdate: boolean
  canDelete: boolean
  canManageMembers: boolean
  canChangeRoles: boolean
  canTransferOwnership: boolean
  canCreateCollection: boolean
  canManageCollection: boolean
  canManageCollectionPrompts: boolean
}

// Context types
export interface TeamContextType {
  currentTeam: Team | null
  userTeams: Team[]
  userRole: TeamRole | null
  permissions: TeamPermissions | null
  setCurrentTeam: (team: Team | null) => void
  refreshTeams: () => Promise<void>
  loading: boolean
}
