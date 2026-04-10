import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamCollectionService } from '@/services/teamCollectionService'
import { canManageCollection } from '@/lib/teamPermissions'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = {
  params: Promise<{ id: string; collectionId: string }>
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/teams/[id]/collections/[collectionId] - Get collection details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId
    const { id: teamIdentifier, collectionId } = await params

    // Get team first to get the actual ID
    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user is a team member
    const isMember = await teamService.isTeamMember(team.id, userId)
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const collection = await teamCollectionService.getCollectionById(collectionId)

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Verify collection belongs to the team
    if (collection.team.id !== team.id) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: collection
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/teams/[id]/collections/[collectionId] - Update collection
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier, collectionId } = await params
    const body = await request.json()
    const { name, description, isPublic } = body

    // Get team first to get the actual ID
    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user can manage collections
    const canManage = await teamCollectionService.canManageCollection(collectionId, userId)
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate input
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Collection name is required' },
          { status: 400 }
        )
      }

      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Collection name must be 100 characters or less' },
          { status: 400 }
        )
      }
    }

    if (description !== undefined && description && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      )
    }

    const collection = await teamCollectionService.updateCollection(collectionId, {
      name: name?.trim(),
      description: description?.trim(),
      isPublic: isPublic
    })

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Failed to update collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: collection
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error updating collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teams/[id]/collections/[collectionId] - Delete collection
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier, collectionId } = await params

    // Get team first to get the actual ID
    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user can manage collections
    const canManage = await teamCollectionService.canManageCollection(collectionId, userId)
    if (!canManage) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const success = await teamCollectionService.deleteCollection(collectionId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error deleting collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}
