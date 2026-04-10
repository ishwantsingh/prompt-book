import { db } from '@/lib/db'
import { TeamRole } from '@prisma/client'

export interface TeamMemberWithUser {
  id: string
  teamId: string
  userId: string
  role: TeamRole
  joinedAt: Date
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    email: string
  }
}

export interface InviteMemberData {
  teamId: string
  userId: string
  role?: TeamRole
  invitedBy: string
}

export class TeamMemberService {
  /**
   * Add a member to a team
   */
  async addMember(data: InviteMemberData): Promise<TeamMemberWithUser | null> {
    try {
      // Check if user is already a member
      const existingMember = await db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: data.teamId,
            userId: data.userId
          }
        }
      })

      if (existingMember) {
        throw new Error('User is already a member of this team')
      }

      // Check if team exists
      const team = await db.team.findUnique({
        where: { id: data.teamId }
      })

      if (!team) {
        throw new Error('Team not found')
      }

      // Add member
      const member = await db.teamMember.create({
        data: {
          teamId: data.teamId,
          userId: data.userId,
          role: data.role || 'MEMBER'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              email: true
            }
          }
        }
      })

      return member as TeamMemberWithUser
    } catch (error) {
      console.error('Error adding team member:', error)
      return null
    }
  }

  /**
   * Remove a member from a team
   */
  async removeMember(teamId: string, userId: string): Promise<boolean> {
    try {
      await db.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        }
      })
      return true
    } catch (error) {
      console.error('Error removing team member:', error)
      return false
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<TeamMemberWithUser | null> {
    try {
      const member = await db.teamMember.update({
        where: {
          teamId_userId: {
            teamId,
            userId
          }
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              email: true
            }
          }
        }
      })

      return member as TeamMemberWithUser
    } catch (error) {
      console.error('Error updating member role:', error)
      return null
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMemberWithUser[]> {
    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: 'asc' }
      ]
    })

    return members as TeamMemberWithUser[]
  }

  /**
   * Get user's team memberships
   */
  async getUserMemberships(userId: string): Promise<TeamMemberWithUser[]> {
    const memberships = await db.teamMember.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    })

    return memberships as TeamMemberWithUser[]
  }

  /**
   * Check if user can manage team members
   */
  async canManageMembers(teamId: string, userId: string): Promise<boolean> {
    const membership = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      select: { role: true }
    })

    if (!membership) {
      return false
    }

    // Only OWNER and ADMIN can manage members
    return membership.role === 'OWNER' || membership.role === 'ADMIN'
  }

  /**
   * Check if user can change roles
   */
  async canChangeRoles(teamId: string, userId: string): Promise<boolean> {
    const membership = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      select: { role: true }
    })

    if (!membership) {
      return false
    }

    // Only OWNER can change roles
    return membership.role === 'OWNER'
  }

  /**
   * Check if user can remove member
   */
  async canRemoveMember(teamId: string, userId: string, targetUserId: string): Promise<boolean> {
    // Can't remove yourself
    if (userId === targetUserId) {
      return false
    }

    const userMembership = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      select: { role: true }
    })

    const targetMembership = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId
        }
      },
      select: { role: true }
    })

    if (!userMembership || !targetMembership) {
      return false
    }

    // OWNER can remove anyone
    if (userMembership.role === 'OWNER') {
      return true
    }

    // ADMIN can remove MEMBERs but not other ADMINs or OWNER
    if (userMembership.role === 'ADMIN' && targetMembership.role === 'MEMBER') {
      return true
    }

    return false
  }

  /**
   * Get member by team and user ID
   */
  async getMember(teamId: string, userId: string): Promise<TeamMemberWithUser | null> {
    const member = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            email: true
          }
        }
      }
    })

    return member as TeamMemberWithUser | null
  }

  /**
   * Get team member count
   */
  async getTeamMemberCount(teamId: string): Promise<number> {
    const count = await db.teamMember.count({
      where: { teamId }
    })

    return count
  }

  /**
   * Check if team has space for more members (optional limit)
   */
  async canAddMember(teamId: string, maxMembers?: number): Promise<boolean> {
    if (!maxMembers) {
      return true
    }

    const currentCount = await this.getTeamMemberCount(teamId)
    return currentCount < maxMembers
  }

  /**
   * Transfer team ownership
   */
  async transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string): Promise<boolean> {
    try {
      await db.$transaction(async (tx) => {
        // Update team owner
        await tx.team.update({
          where: { id: teamId },
          data: { ownerId: newOwnerId }
        })

        // Update member roles
        await tx.teamMember.updateMany({
          where: {
            teamId,
            userId: { in: [currentOwnerId, newOwnerId] }
          },
          data: {
            role: 'ADMIN' // Previous owner becomes admin
          }
        })

        // Set new owner role
        await tx.teamMember.update({
          where: {
            teamId_userId: {
              teamId,
              userId: newOwnerId
            }
          },
          data: {
            role: 'OWNER'
          }
        })
      })

      return true
    } catch (error) {
      console.error('Error transferring ownership:', error)
      return false
    }
  }
}

export const teamMemberService = new TeamMemberService()
