import { NextRequest, NextResponse } from 'next/server'
import { teamService } from '@/services/teamService'
import { teamMemberService } from '@/services/teamMemberService'
import {
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
type RouteContext = { params: Promise<{ id: string }> }

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/teams/[id]/join - Join a public team
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const { id: teamIdentifier } = await params

    // Check if team exists and is public
    const team = await teamService.getTeamByIdOrSlug(teamIdentifier)
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Team not found' },
        { status: 404 }
      )
    }

    if (!team.isPublic) {
      return NextResponse.json(
        { success: false, error: 'Team is not public' },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const isMember = await teamService.isTeamMember(team.id, userId)
    if (isMember) {
      return NextResponse.json(
        { success: false, error: 'Already a member of this team' },
        { status: 400 }
      )
    }

    // Add user as member
    const member = await teamMemberService.addMember({
      teamId: team.id,
      userId,
      role: 'MEMBER',
      invitedBy: team.ownerId
    })

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Failed to join team' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: member,
      message: 'Successfully joined team'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error joining team:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to join team' },
      { status: 500 }
    )
  }
}
