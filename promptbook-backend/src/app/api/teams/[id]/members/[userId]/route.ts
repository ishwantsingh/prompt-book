import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamMemberService } from '@/services/teamMemberService'
import { canManageMembers, canChangeRoles, canRemoveMember } from '@/lib/teamPermissions'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string; userId: string }> }

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * PUT /api/teams/[id]/members/[userId] - Update member role
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const currentUserId = user.userId

    const { id: teamIdentifier, userId: targetUserId } = await params
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['MEMBER', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
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

    // Check if user can change roles
    const userRole = await teamService.getUserTeamRole(team.id, currentUserId)
    if (!userRole || !canChangeRoles(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get target user's current role
    const targetRole = await teamService.getUserTeamRole(team.id, targetUserId)
    if (!targetRole) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this team' },
        { status: 404 }
      )
    }

    // Check if user can change this member's role
    if (!canRemoveMember(userRole, targetRole)) {
      return NextResponse.json(
        { success: false, error: 'Cannot change this member\'s role' },
        { status: 403 }
      )
    }

    const member = await teamMemberService.updateMemberRole(team.id, targetUserId, role)

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: member
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error updating member role:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teams/[id]/members/[userId] - Remove member from team
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const currentUserId = user.userId

    const { id: teamIdentifier, userId: targetUserId } = await params

    // Get team first to get the actual ID
    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user can manage members
    const userRole = await teamService.getUserTeamRole(team.id, currentUserId)
    if (!userRole || !canManageMembers(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get target user's current role
    const targetRole = await teamService.getUserTeamRole(team.id, targetUserId)
    if (!targetRole) {
      return NextResponse.json(
        { success: false, error: 'User is not a member of this team' },
        { status: 404 }
      )
    }

    // Check if user can remove this member
    if (!canRemoveMember(userRole, targetRole)) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove this member' },
        { status: 403 }
      )
    }

    const success = await teamMemberService.removeMember(team.id, targetUserId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error removing team member:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}
