import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamCollectionService } from '@/services/teamCollectionService'
import { canCreateCollection } from '@/lib/teamPermissions'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string }> }

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/teams/[id]/collections - Get team collections
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId
    const { id: teamIdentifier } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

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

    let collections
    if (search) {
      collections = await teamCollectionService.searchCollections(search, team.id)
    } else {
      collections = await teamCollectionService.getTeamCollections(team.id)
    }

    return NextResponse.json({
      success: true,
      data: collections
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching team collections:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team collections' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams/[id]/collections - Create team collection
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier } = await params
    const body = await request.json()
    const { name, description, isPublic } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
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

    // Get team first to get the actual ID
    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      )
    }

    // Check if user can create collections
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (!userRole || !canCreateCollection(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const collection = await teamCollectionService.createCollection({
      teamId: team.id,
      name: name.trim(),
      description: description?.trim() || undefined,
      isPublic: Boolean(isPublic),
      createdBy: userId
    })

    if (!collection) {
      return NextResponse.json(
        { success: false, error: 'Failed to create collection' },
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

    console.error('Error creating team collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create team collection' },
      { status: 500 }
    )
  }
}
