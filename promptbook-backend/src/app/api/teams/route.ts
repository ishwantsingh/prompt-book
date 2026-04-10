import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRequest,
  getAuthErrorResponse,
  requireAuthenticatedUser,
} from '@/lib/request-auth'
import { teamService } from '@/services/teamService'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/teams - Get teams for user or public teams
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = await authenticateRequest(request)
    const userId = user?.userId || null
    const type = searchParams.get('type') // 'user', 'public', 'all'
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let teams = []

    if (type === 'public' || type === 'all') {
      if (search) {
        teams = await teamService.searchTeams(search, limit, offset)
      } else {
        teams = await teamService.getPublicTeams(limit, offset)
      }
    } else if (type === 'user' && userId) {
      teams = await teamService.getUserTeams(userId)
    } else if (type === 'user') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    } else if (type === 'all' && userId) {
      // Get both user teams and public teams
      const userTeams = await teamService.getUserTeams(userId)
      const publicTeams = await teamService.getPublicTeams(limit, offset)
      
      // Combine and deduplicate
      const teamMap = new Map()
      const allTeams = [...userTeams, ...publicTeams]
      allTeams.forEach(team => {
        teamMap.set(team.id, team)
      })
      teams = Array.from(teamMap.values())
    }

    return NextResponse.json({
      success: true,
      data: teams,
      pagination: {
        limit,
        offset,
        total: teams.length
      }
    })
  } catch (error) {
    const authErrorResponse = getAuthErrorResponse(error)
    if (authErrorResponse) {
      return authErrorResponse
    }

    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams - Create a new team
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request)
    const userId = user.userId

    const body = await request.json()
    const { name, description, isPublic } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
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

    if (description && description.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      )
    }

    const team = await teamService.createTeam({
      name: name.trim(),
      description: description?.trim() || undefined,
      isPublic: Boolean(isPublic),
      ownerId: userId
    })

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Failed to create team' },
        { status: 500 }
      )
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

    console.error('Error creating team:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    )
  }
}
