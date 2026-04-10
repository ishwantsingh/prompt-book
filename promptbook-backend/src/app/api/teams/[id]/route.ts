import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamMemberService } from '@/services/teamMemberService'
import { canUpdateTeam, canDeleteTeam } from '@/lib/teamPermissions'
import {
  authenticateRequest,
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string }> }

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/teams/[id] - Get team by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await authenticateRequest(request)
    const userId = user?.userId || null
    const { id: teamIdentifier } = await params

    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user can access the team
    if (!team.isPublic) {
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const isMember = await teamService.isTeamMember(team.id, userId)
      if (!isMember) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: team
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching team:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/teams/[id] - Update team
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier } = await params
    const body = await request.json()
    const { name, description, isPublic } = body

    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user can update the team
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (!userRole || !canUpdateTeam(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate input
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Team name is required' },
          { status: 400 }
        )
      }

      if (name.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Team name must be 100 characters or less' },
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

    const updatedTeam = await teamService.updateTeam(team.id, {
      name: name?.trim(),
      description: description?.trim(),
      isPublic: isPublic
    })

    if (!updatedTeam) {
      return NextResponse.json(
        { success: false, error: 'Failed to update team' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedTeam
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error updating team:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update team' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teams/[id] - Delete team
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier } = await params

    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user can delete the team
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (!userRole || !canDeleteTeam(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const success = await teamService.deleteTeam(team.id)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete team' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error deleting team:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete team' },
      { status: 500 }
    )
  }
}
