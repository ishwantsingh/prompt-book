import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface CreateTeamData {
  name: string
  description?: string
  isPublic?: boolean
  ownerId: string
}

export interface UpdateTeamData {
  name?: string
  description?: string
  isPublic?: boolean
}

export interface TeamWithMembers {
  id: string
  name: string
  slug: string
  description: string | null
  isPublic: boolean
  ownerId: string
  createdAt: Date
  updatedAt: Date
  owner: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  members: Array<{
    id: string
    role: string
    joinedAt: Date
    user: {
      id: string
      username: string
      displayName: string | null
      avatarUrl: string | null
    }
  }>
  _count: {
    members: number
    collections: number
  }
}

export class TeamService {
  /**
   * Generate a unique slug from team name
   */
  private async generateSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    let slug = baseSlug
    let counter = 1
    
    while (await this.slugExists(slug)) {
      slug = `${baseSlug}-${counter}`
      counter++
    }
    
    return slug
  }

  /**
   * Check if a slug already exists
   */
  private async slugExists(slug: string): Promise<boolean> {
    const existing = await db.team.findUnique({
      where: { slug }
    })
    return !!existing
  }

  /**
   * Create a new team
   */
  async createTeam(data: CreateTeamData): Promise<TeamWithMembers> {
    const slug = await this.generateSlug(data.name)
    
    const team = await db.team.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        isPublic: data.isPublic || false,
        ownerId: data.ownerId,
        members: {
          create: {
            userId: data.ownerId,
            role: 'OWNER'
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      }
    })

    return team as TeamWithMembers
  }

  /**
   * Get team by ID or slug with members
   */
  async getTeamByIdOrSlug(identifier: string): Promise<TeamWithMembers | null> {
    // Try by ID first
    let team = await this.getTeamById(identifier)
    if (!team) {
      // Try by slug
      team = await this.getTeamBySlug(identifier)
    }
    return team
  }

  /**
   * Get team by ID with members
   */
  async getTeamById(teamId: string): Promise<TeamWithMembers | null> {
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      }
    })

    return team as TeamWithMembers | null
  }

  /**
   * Get team by slug
   */
  async getTeamBySlug(slug: string): Promise<TeamWithMembers | null> {
    const team = await db.team.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      }
    })

    return team as TeamWithMembers | null
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, data: UpdateTeamData): Promise<TeamWithMembers | null> {
    const updateData: Prisma.TeamUpdateInput = {
      name: data.name,
      description: data.description,
      isPublic: data.isPublic
    }

    // If name is being updated, generate new slug
    if (data.name) {
      updateData.slug = await this.generateSlug(data.name)
    }

    const team = await db.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      }
    })

    return team as TeamWithMembers
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<boolean> {
    try {
      await db.team.delete({
        where: { id: teamId }
      })
      return true
    } catch (error) {
      console.error('Error deleting team:', error)
      return false
    }
  }

  /**
   * Get teams for a user (owned + member of)
   */
  async getUserTeams(userId: string): Promise<TeamWithMembers[]> {
    const teams = await db.team.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return teams as TeamWithMembers[]
  }

  /**
   * Get public teams (for discovery)
   */
  async getPublicTeams(limit: number = 20, offset: number = 0): Promise<TeamWithMembers[]> {
    const teams = await db.team.findMany({
      where: { isPublic: true },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return teams as TeamWithMembers[]
  }

  /**
   * Search teams by name or description
   */
  async searchTeams(query: string, limit: number = 20, offset: number = 0): Promise<TeamWithMembers[]> {
    const teams = await db.team.findMany({
      where: {
        AND: [
          { isPublic: true },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            collections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    return teams as TeamWithMembers[]
  }

  /**
   * Check if user is team owner
   */
  async isTeamOwner(teamId: string, userId: string): Promise<boolean> {
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { ownerId: true }
    })

    return team?.ownerId === userId
  }

  /**
   * Check if user is team member
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const membership = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      }
    })

    return !!membership
  }

  /**
   * Get user's role in team
   */
  async getUserTeamRole(teamId: string, userId: string): Promise<string | null> {
    const membership = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId
        }
      },
      select: { role: true }
    })

    return membership?.role || null
  }
}

export const teamService = new TeamService()
