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
 * POST /api/teams/[id]/leave - Leave a team
 */
export async function POST(
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

    // Check if user is a member
    const isMember = await teamService.isTeamMember(team.id, userId)
    if (!isMember) {
      return NextResponse.json(
        { success: false, error: 'Not a member of this team' },
        { status: 404 }
      )
    }

    // Check if user is the owner
    const userRole = await teamService.getUserTeamRole(team.id, userId)
    if (userRole === 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Owner cannot leave team. Transfer ownership first.' },
        { status: 400 }
      )
    }

    // Remove user from team
    const success = await teamMemberService.removeMember(team.id, userId)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to leave team' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left team'
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error leaving team:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to leave team' },
      { status: 500 }
    )
  }
}
