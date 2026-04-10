import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamMemberService } from '@/services/teamMemberService'
import { canManageMembers } from '@/lib/teamPermissions'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string }> }

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/teams/[id]/members - Get team members
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId
    const { id: teamIdentifier } = await params

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

    const members = await teamMemberService.getTeamMembers(team.id)

    return NextResponse.json({
      success: true,
      data: members
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams/[id]/members - Add member to team
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
    const { memberUserId, role = 'MEMBER' } = body

    if (!memberUserId) {
      return NextResponse.json(
        { success: false, error: 'Member user ID is required' },
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

    // Check if user can manage members
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (!userRole || !canManageMembers(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
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

    const member = await teamMemberService.addMember({
      teamId: team.id,
      userId: memberUserId,
      role,
      invitedBy: userId
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Failed to add member' },
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

    console.error('Error adding team member:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}
