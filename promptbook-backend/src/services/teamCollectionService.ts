import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export interface CreateTeamCollectionData {
  teamId: string
  name: string
  description?: string
  isPublic?: boolean
  createdBy: string
}

export interface UpdateTeamCollectionData {
  name?: string
  description?: string
  isPublic?: boolean
}

export interface TeamCollectionWithPrompts {
  id: string
  teamId: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
  team: {
    id: string
    name: string
    slug: string
  }
  prompts: Array<{
    id: string
    addedAt: Date
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
      createdAt: Date
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
  }>
  _count: {
    prompts: number
  }
}

export class TeamCollectionService {
  /**
   * Create a new team collection
   */
  async createCollection(data: CreateTeamCollectionData): Promise<TeamCollectionWithPrompts | null> {
    try {
      const collection = await db.teamCollection.create({
        data: {
          teamId: data.teamId,
          name: data.name,
          description: data.description,
          isPublic: data.isPublic || false
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          prompts: {
            include: {
              prompt: {
                include: {
                  author: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatarUrl: true
                    }
                  },
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true
                    }
                  },
                  subcategory: {
                    select: {
                      id: true,
                      name: true,
                      slug: true
                    }
                  },
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
                    }
                  }
                }
              }
            },
            orderBy: { addedAt: 'desc' }
          },
          _count: {
            select: {
              prompts: true
            }
          }
        }
      })

      return collection as TeamCollectionWithPrompts
    } catch (error) {
      console.error('Error creating team collection:', error)
      return null
    }
  }

  /**
   * Get collection by ID
   */
  async getCollectionById(collectionId: string): Promise<TeamCollectionWithPrompts | null> {
    const collection = await db.teamCollection.findUnique({
      where: { id: collectionId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        prompts: {
          include: {
            prompt: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
                subcategory: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
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
                  }
                }
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        },
        _count: {
          select: {
            prompts: true
          }
        }
      }
    })

    return collection as TeamCollectionWithPrompts | null
  }

  /**
   * Get collections for a team
   */
  async getTeamCollections(teamId: string): Promise<TeamCollectionWithPrompts[]> {
    const collections = await db.teamCollection.findMany({
      where: { teamId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        prompts: {
          include: {
            prompt: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
                subcategory: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
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
                  }
                }
              }
            }
          },
          orderBy: { addedAt: 'desc' },
          take: 5 // Limit prompts for list view
        },
        _count: {
          select: {
            prompts: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return collections as TeamCollectionWithPrompts[]
  }

  /**
   * Update collection
   */
  async updateCollection(collectionId: string, data: UpdateTeamCollectionData): Promise<TeamCollectionWithPrompts | null> {
    try {
      const collection = await db.teamCollection.update({
        where: { id: collectionId },
        data: {
          name: data.name,
          description: data.description,
          isPublic: data.isPublic
        },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          prompts: {
            include: {
              prompt: {
                include: {
                  author: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatarUrl: true
                    }
                  },
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true
                    }
                  },
                  subcategory: {
                    select: {
                      id: true,
                      name: true,
                      slug: true
                    }
                  },
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
                    }
                  }
                }
              }
            },
            orderBy: { addedAt: 'desc' }
          },
          _count: {
            select: {
              prompts: true
            }
          }
        }
      })

      return collection as TeamCollectionWithPrompts
    } catch (error) {
      console.error('Error updating team collection:', error)
      return null
    }
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    try {
      await db.teamCollection.delete({
        where: { id: collectionId }
      })
      return true
    } catch (error) {
      console.error('Error deleting team collection:', error)
      return false
    }
  }

  /**
   * Add prompt to collection
   */
  async addPromptToCollection(collectionId: string, promptId: string, addedBy: string): Promise<boolean> {
    try {
      // Check if prompt is already in collection
      const existing = await db.teamCollectionPrompt.findUnique({
        where: {
          teamCollectionId_promptId: {
            teamCollectionId: collectionId,
            promptId
          }
        }
      })

      if (existing) {
        throw new Error('Prompt is already in this collection')
      }

      // Add prompt to collection
      await db.teamCollectionPrompt.create({
        data: {
          teamCollectionId: collectionId,
          promptId,
          addedBy
        }
      })

      return true
    } catch (error) {
      console.error('Error adding prompt to collection:', error)
      return false
    }
  }

  /**
   * Remove prompt from collection
   */
  async removePromptFromCollection(collectionId: string, promptId: string): Promise<boolean> {
    try {
      await db.teamCollectionPrompt.delete({
        where: {
          teamCollectionId_promptId: {
            teamCollectionId: collectionId,
            promptId
          }
        }
      })

      return true
    } catch (error) {
      console.error('Error removing prompt from collection:', error)
      return false
    }
  }

  /**
   * Check if user can manage collection
   */
  async canManageCollection(collectionId: string, userId: string): Promise<boolean> {
    const collection = await db.teamCollection.findUnique({
      where: { id: collectionId },
      include: {
        team: {
          include: {
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    })

    if (!collection) {
      return false
    }

    // Team owner can manage all collections
    if (collection.team.ownerId === userId) {
      return true
    }

    // Team members with ADMIN or OWNER role can manage collections
    const membership = collection.team.members[0]
    return membership && (membership.role === 'ADMIN' || membership.role === 'OWNER')
  }

  /**
   * Get collections containing a specific prompt
   */
  async getCollectionsWithPrompt(promptId: string, teamId?: string): Promise<TeamCollectionWithPrompts[]> {
    const whereClause: Prisma.TeamCollectionWhereInput = {
      prompts: {
        some: { promptId }
      }
    }

    if (teamId) {
      whereClause.teamId = teamId
    }

    const collections = await db.teamCollection.findMany({
      where: whereClause,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        prompts: {
          include: {
            prompt: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
                subcategory: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
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
                  }
                }
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        },
        _count: {
          select: {
            prompts: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return collections as TeamCollectionWithPrompts[]
  }

  /**
   * Search collections by name or description
   */
  async searchCollections(query: string, teamId?: string): Promise<TeamCollectionWithPrompts[]> {
    const whereClause: Prisma.TeamCollectionWhereInput = {
      AND: [
        {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        }
      ]
    }

    if (teamId) {
      whereClause.teamId = teamId
    }

    const collections = await db.teamCollection.findMany({
      where: whereClause,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        prompts: {
          include: {
            prompt: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true
                  }
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
                subcategory: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
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
                  }
                }
              }
            }
          },
          orderBy: { addedAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            prompts: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return collections as TeamCollectionWithPrompts[]
  }
}

export const teamCollectionService = new TeamCollectionService()
