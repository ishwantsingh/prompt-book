import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamCollectionService } from '@/services/teamCollectionService'
import { canManageCollectionPrompts } from '@/lib/teamPermissions'
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
 * GET /api/teams/[id]/collections/[collectionId]/prompts - Get prompts in collection
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
      data: collection.prompts.map(cp => ({
        ...cp.prompt,
        prompt: cp.prompt.content
      }))
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching collection prompts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch collection prompts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams/[id]/collections/[collectionId]/prompts - Add prompt to collection
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier, collectionId } = await params
    const body = await request.json()
    const { promptId } = body

    if (!promptId) {
      return NextResponse.json(
        { success: false, error: 'Prompt ID is required' },
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

    // Check if user is a team member
    const isMember = await teamService.isTeamMember(team.id, userId)
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user can manage collection prompts
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (!userRole || !canManageCollectionPrompts(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const success = await teamCollectionService.addPromptToCollection(collectionId, promptId, userId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to add prompt to collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt added to collection successfully'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error adding prompt to collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add prompt to collection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teams/[id]/collections/[collectionId]/prompts - Remove prompt from collection
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier, collectionId } = await params
    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('promptId')

    if (!promptId) {
      return NextResponse.json(
        { success: false, error: 'Prompt ID is required' },
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

    // Check if user is a team member
    const isMember = await teamService.isTeamMember(team.id, userId)
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user can manage collection prompts
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (!userRole || !canManageCollectionPrompts(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const success = await teamCollectionService.removePromptFromCollection(collectionId, promptId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove prompt from collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt removed from collection successfully'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error removing prompt from collection:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove prompt from collection' },
      { status: 500 }
    )
  }
}
