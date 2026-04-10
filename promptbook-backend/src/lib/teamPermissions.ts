import { TeamRole } from '@prisma/client'

export type Permission = 
  | 'team:read'
  | 'team:update'
  | 'team:delete'
  | 'team:manage_members'
  | 'team:change_roles'
  | 'team:transfer_ownership'
  | 'collection:create'
  | 'collection:read'
  | 'collection:update'
  | 'collection:delete'
  | 'collection:manage_prompts'

export interface TeamPermissionMatrix {
  [key: string]: Permission[]
}

/**
 * Permission matrix defining what each role can do
 */
export const TEAM_PERMISSIONS: TeamPermissionMatrix = {
  OWNER: [
    'team:read',
    'team:update',
    'team:delete',
    'team:manage_members',
    'team:change_roles',
    'team:transfer_ownership',
    'collection:create',
    'collection:read',
    'collection:update',
    'collection:delete',
    'collection:manage_prompts'
  ],
  ADMIN: [
    'team:read',
    'team:update',
    'team:manage_members',
    'collection:create',
    'collection:read',
    'collection:update',
    'collection:delete',
    'collection:manage_prompts'
  ],
  MEMBER: [
    'team:read',
    'collection:create',
    'collection:read',
    'collection:update',
    'collection:manage_prompts'
  ]
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TeamRole | string, permission: Permission): boolean {
  const rolePermissions = TEAM_PERMISSIONS[role as TeamRole] || []
  return rolePermissions.includes(permission)
}

/**
 * Check if user can perform an action on a team
 */
export function canPerformAction(
  userRole: TeamRole | string | null,
  action: Permission
): boolean {
  if (!userRole) {
    return false
  }

  return hasPermission(userRole, action)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: TeamRole | string): Permission[] {
  return TEAM_PERMISSIONS[role as TeamRole] || []
}

/**
 * Check if user can manage team members
 */
export function canManageMembers(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'team:manage_members')
}

/**
 * Check if user can change member roles
 */
export function canChangeRoles(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'team:change_roles')
}

/**
 * Check if user can transfer ownership
 */
export function canTransferOwnership(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'team:transfer_ownership')
}

/**
 * Check if user can update team settings
 */
export function canUpdateTeam(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'team:update')
}

/**
 * Check if user can delete team
 */
export function canDeleteTeam(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'team:delete')
}

/**
 * Check if user can create collections
 */
export function canCreateCollection(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'collection:create')
}

/**
 * Check if user can manage collections
 */
export function canManageCollection(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'collection:update') || 
         canPerformAction(userRole, 'collection:delete')
}

/**
 * Check if user can manage prompts in collections
 */
export function canManageCollectionPrompts(userRole: TeamRole | string | null): boolean {
  return canPerformAction(userRole, 'collection:manage_prompts')
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
 * Check if user can remove another member based on roles
 */
export function canRemoveMember(
  userRole: TeamRole | string | null,
  targetRole: TeamRole | string | null
): boolean {
  if (!userRole || !targetRole) {
    return false
  }

  // Can't remove yourself
  if (userRole === targetRole) {
    return false
  }

  // OWNER can remove anyone
  if (userRole === 'OWNER') {
    return true
  }

  // ADMIN can remove MEMBERs but not other ADMINs or OWNER
  if (userRole === 'ADMIN' && targetRole === 'MEMBER') {
    return true
  }

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
  if (!userRole || !targetRole) {
    return false
  }

  // Only OWNER can change roles
  if (userRole !== 'OWNER') {
    return false
  }

  // Can't change your own role
  if (userRole === targetRole) {
    return false
  }

  // Can't promote someone to OWNER (use transfer ownership instead)
  if (newRole === 'OWNER') {
    return false
  }

  return true
}

/**
 * Validate role transition
 */
export function isValidRoleTransition(
  fromRole: TeamRole | string,
  toRole: TeamRole | string
): boolean {
  // Can't change to OWNER (use transfer ownership)
  if (toRole === 'OWNER') {
    return false
  }

  // Can't change from OWNER (use transfer ownership)
  if (fromRole === 'OWNER') {
    return false
  }

  return true
}

/**
 * Get available roles for assignment (excludes OWNER)
 */
export function getAssignableRoles(): TeamRole[] {
  return ['ADMIN', 'MEMBER']
}

/**
 * Check if user can access team resource
 */
export function canAccessTeamResource(
  userRole: TeamRole | string | null,
  resourceType: 'team' | 'collection' | 'member'
): boolean {
  if (!userRole) {
    return false
  }

  switch (resourceType) {
    case 'team':
      return canPerformAction(userRole, 'team:read')
    case 'collection':
      return canPerformAction(userRole, 'collection:read')
    case 'member':
      return canPerformAction(userRole, 'team:read')
    default:
      return false
  }
}

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
