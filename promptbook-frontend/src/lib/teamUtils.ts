import { TeamRole, Team, TeamMember, TeamPermissions } from '@/types/team'

/**
 * Get role display name
 */
export function getRoleDisplayName(role: TeamRole | string): string {
  const displayNames = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member'
  }
  
  return displayNames[role as TeamRole] || 'Unknown'
}

/**
 * Get role description
 */
export function getRoleDescription(role: TeamRole | string): string {
  const descriptions = {
    OWNER: 'Full control over team and all resources',
    ADMIN: 'Can manage members and collections',
    MEMBER: 'Can view team and manage collections'
  }
  
  return descriptions[role as TeamRole] || 'Unknown role'
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: TeamRole | string): string {
  const colors = {
    OWNER: 'bg-purple-100 text-purple-800 border-purple-200',
    ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
    MEMBER: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return colors[role as TeamRole] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: TeamRole | string): number {
  const levels = {
    MEMBER: 1,
    ADMIN: 2,
    OWNER: 3
  }
  
  return levels[role as TeamRole] || 0
}

/**
 * Check if one role is higher than another
 */
export function isRoleHigher(role1: TeamRole | string, role2: TeamRole | string): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2)
}

/**
 * Check if user can manage team members
 */
export function canManageMembers(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return userRole === 'OWNER' || userRole === 'ADMIN'
}

/**
 * Check if user can change member roles
 */
export function canChangeRoles(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return userRole === 'OWNER'
}

/**
 * Check if user can transfer ownership
 */
export function canTransferOwnership(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return userRole === 'OWNER'
}

/**
 * Check if user can update team settings
 */
export function canUpdateTeam(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return userRole === 'OWNER' || userRole === 'ADMIN'
}

/**
 * Check if user can delete team
 */
export function canDeleteTeam(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return userRole === 'OWNER'
}

/**
 * Check if user can create collections
 */
export function canCreateCollection(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return ['OWNER', 'ADMIN', 'MEMBER'].includes(userRole)
}

/**
 * Check if user can manage collections
 */
export function canManageCollection(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return userRole === 'OWNER' || userRole === 'ADMIN'
}

/**
 * Check if user can manage prompts in collections
 */
export function canManageCollectionPrompts(userRole: TeamRole | string | null): boolean {
  if (!userRole) return false
  return ['OWNER', 'ADMIN', 'MEMBER'].includes(userRole)
}

/**
 * Check if user can remove another member based on roles
 */
export function canRemoveMember(
  userRole: TeamRole | string | null,
  targetRole: TeamRole | string | null
): boolean {
  if (!userRole || !targetRole) return false

  // Can't remove yourself
  if (userRole === targetRole) return false

  // OWNER can remove anyone
  if (userRole === 'OWNER') return true

  // ADMIN can remove MEMBERs but not other ADMINs or OWNER
  if (userRole === 'ADMIN' && targetRole === 'MEMBER') return true

  return false
}

/**
 * Check if user can change another member's role
 */
export function canChangeMemberRole(
  userRole: TeamRole | string | null,
  targetRole: TeamRole | string | null,
  newRole: TeamRole | string
): boolean {
  if (!userRole || !targetRole) return false

  // Only OWNER can change roles
  if (userRole !== 'OWNER') return false

  // Can't change your own role
  if (userRole === targetRole) return false

  // Can't promote someone to OWNER (use transfer ownership instead)
  if (newRole === 'OWNER') return false

  return true
}

/**
 * Get all permissions for a user role
 */
export function getTeamPermissions(userRole: TeamRole | string | null): TeamPermissions {
  if (!userRole) {
    return {
      canRead: false,
      canUpdate: false,
      canDelete: false,
      canManageMembers: false,
      canChangeRoles: false,
      canTransferOwnership: false,
      canCreateCollection: false,
      canManageCollection: false,
      canManageCollectionPrompts: false
    }
  }

  return {
    canRead: true,
    canUpdate: canUpdateTeam(userRole),
    canDelete: canDeleteTeam(userRole),
    canManageMembers: canManageMembers(userRole),
    canChangeRoles: canChangeRoles(userRole),
    canTransferOwnership: canTransferOwnership(userRole),
    canCreateCollection: canCreateCollection(userRole),
    canManageCollection: canManageCollection(userRole),
    canManageCollectionPrompts: canManageCollectionPrompts(userRole)
  }
}

/**
 * Get available roles for assignment (excludes OWNER)
 */
export function getAssignableRoles(): TeamRole[] {
  return ['ADMIN', 'MEMBER']
}

/**
 * Validate role transition
 */
export function isValidRoleTransition(
  fromRole: TeamRole | string,
  toRole: TeamRole | string
): boolean {
  // Can't change to OWNER (use transfer ownership)
  if (toRole === 'OWNER') return false

  // Can't change from OWNER (use transfer ownership)
  if (fromRole === 'OWNER') return false

  return true
}

/**
 * Format team member count
 */
export function formatMemberCount(count: number): string {
  if (count === 0) return 'No members'
  if (count === 1) return '1 member'
  return `${count} members`
}

/**
 * Format collection count
 */
export function formatCollectionCount(count: number): string {
  if (count === 0) return 'No collections'
  if (count === 1) return '1 collection'
  return `${count} collections`
}

/**
 * Format team creation date
 */
export function formatTeamDate(date: string): string {
  const teamDate = new Date(date)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - teamDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

/**
 * Generate team slug from name
 */
export function generateTeamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Validate team name
 */
export function validateTeamName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Team name is required' }
  }

  if (name.length > 100) {
    return { isValid: false, error: 'Team name must be 100 characters or less' }
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Team name must be at least 2 characters' }
  }

  return { isValid: true }
}

/**
 * Validate team description
 */
export function validateTeamDescription(description: string): { isValid: boolean; error?: string } {
  if (description && description.length > 500) {
    return { isValid: false, error: 'Description must be 500 characters or less' }
  }

  return { isValid: true }
}

/**
 * Validate collection name
 */
export function validateCollectionName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Collection name is required' }
  }

  if (name.length > 100) {
    return { isValid: false, error: 'Collection name must be 100 characters or less' }
  }

  if (name.length < 2) {
    return { isValid: false, error: 'Collection name must be at least 2 characters' }
  }

  return { isValid: true }
}

/**
 * Check if team is owned by user
 */
export function isTeamOwner(team: Team, userId: string): boolean {
  return team.ownerId === userId
}

/**
 * Get user's role in team
 */
export function getUserTeamRole(team: Team, userId: string): TeamRole | null {
  const member = team.members.find(m => m.userId === userId)
  return member?.role || null
}

/**
 * Check if user is team member
 */
export function isTeamMember(team: Team, userId: string): boolean {
  return team.members.some(m => m.userId === userId)
}

/**
 * Get team member by user ID
 */
export function getTeamMember(team: Team, userId: string): TeamMember | null {
  return team.members.find(m => m.userId === userId) || null
}

/**
 * Sort team members by role and join date
 */
export function sortTeamMembers(members: TeamMember[]): TeamMember[] {
  return members.sort((a, b) => {
    // First sort by role (OWNER, ADMIN, MEMBER)
    const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 }
    const roleDiff = roleOrder[a.role] - roleOrder[b.role]
    
    if (roleDiff !== 0) return roleDiff
    
    // Then sort by join date (earliest first)
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
  })
}

/**
 * Filter team members by role
 */
export function filterMembersByRole(members: TeamMember[], role: TeamRole): TeamMember[] {
  return members.filter(member => member.role === role)
}

/**
 * Get team statistics
 */
export function getTeamStats(team: Team) {
  const memberCount = team.members.length
  const collectionCount = team._count.collections
  const ownerCount = team.members.filter(m => m.role === 'OWNER').length
  const adminCount = team.members.filter(m => m.role === 'ADMIN').length
  const memberRoleCount = team.members.filter(m => m.role === 'MEMBER').length

  return {
    memberCount,
    collectionCount,
    ownerCount,
    adminCount,
    memberRoleCount
  }
}

/**
 * Check if team can be joined (public and not already a member)
 */
export function canJoinTeam(team: Team, userId: string): boolean {
  return team.isPublic && !isTeamMember(team, userId)
}

/**
 * Check if team can be left (not owner)
 */
export function canLeaveTeam(team: Team, userId: string): boolean {
  const userRole = getUserTeamRole(team, userId)
  return userRole !== 'OWNER'
}
