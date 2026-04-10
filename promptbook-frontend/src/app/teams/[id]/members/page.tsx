'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, withUserHeader } from '@/lib/utils'
import { Team, TeamMember, TeamRole } from '@/types/team'
import { formatTeamDate, canManageMembers, canChangeRoles, canRemoveMember } from '@/lib/teamUtils'

export default function TeamMembersPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<TeamRole | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Load team and members data
  useEffect(() => {
    const loadTeamData = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        
        // Load team details
        const teamResponse = await apiFetch(`${baseUrl}/api/teams/${teamId}`, withUserHeader({}, session.user.id))
        
        if (teamResponse.ok) {
          const teamData = await teamResponse.json()
          if (teamData.success && teamData.data) {
            setTeam(teamData.data)
            
            // Load team members
            const membersResponse = await apiFetch(`${baseUrl}/api/teams/${teamId}/members`, withUserHeader({}, session.user.id))
            
            if (membersResponse.ok) {
              const membersData = await membersResponse.json()
              if (membersData.success && membersData.data) {
                setMembers(membersData.data)
                
                // Find current user's role
                const currentUserMember = membersData.data.find((member: TeamMember) => member.userId === session.user.id)
                if (currentUserMember) {
                  setUserRole(currentUserMember.role)
                }
              }
            }
          }
        } else {
          const errorData = await teamResponse.json()
          setError(errorData.error || 'Failed to load team')
        }
      } catch (err) {
        console.error('Error loading team data:', err)
        setError('Failed to load team data')
      } finally {
        setLoading(false)
      }
    }

    loadTeamData()
  }, [session, teamId])

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    if (!canChangeRoles(userRole)) return

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await apiFetch(
        `${baseUrl}/api/teams/${teamId}/members/${memberId}`,
        withUserHeader({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole })
        }, session?.user?.id)
      )

      if (response.ok) {
        // Update local state
        setMembers(prev => prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        ))
      } else {
        const errorData = await response.json()
        console.error('Failed to update role:', errorData.error)
      }
    } catch (err) {
      console.error('Error updating role:', err)
    }
  }

  const handleRemoveMember = async (memberId: string, targetRole: TeamRole) => {
    if (!canRemoveMember(userRole, targetRole)) return

    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await apiFetch(
        `${baseUrl}/api/teams/${teamId}/members/${memberId}`,
        withUserHeader({
          method: 'DELETE'
        }, session?.user?.id)
      )

      if (response.ok) {
        // Update local state
        setMembers(prev => prev.filter(member => member.id !== memberId))
      } else {
        const errorData = await response.json()
        console.error('Failed to remove member:', errorData.error)
      }
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  const handleJoinTeam = async () => {
    if (!session?.user || !team?.isPublic) return

    try {
      setIsJoining(true)
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await apiFetch(
        `${baseUrl}/api/teams/${teamId}/join`,
        withUserHeader({
          method: 'POST'
        }, session.user.id)
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Reload team data to show updated membership
          window.location.reload()
        } else {
          console.error('Failed to join team:', data.error)
          alert(data.error || 'Failed to join team')
        }
      } else {
        const errorData = await response.json()
        console.error('Failed to join team:', errorData.error)
        alert(errorData.error || 'Failed to join team')
      }
    } catch (err) {
      console.error('Error joining team:', err)
      alert('Failed to join team')
    } finally {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/teams"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Teams
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Team Not Found</h1>
            <p className="text-gray-600 mb-6">The team you&apos;re looking for doesn&apos;t exist.</p>
            <Link
              href="/teams"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Teams
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link href="/teams" className="hover:text-gray-700">Teams</Link>
            <span>/</span>
            <Link href={`/teams/${teamId}`} className="hover:text-gray-700">{team.name}</Link>
            <span>/</span>
            <span className="text-gray-900">Members</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
              <p className="mt-2 text-gray-600">
                Manage team members and their roles
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Join Team Button - Show for non-members of public teams */}
              {session?.user && !userRole && team?.isPublic && (
                <button
                  onClick={handleJoinTeam}
                  disabled={isJoining}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining...' : 'Join Team'}
                </button>
              )}
              
              <Link
                href={`/teams/${teamId}`}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Back to Team
              </Link>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {members.map((member) => (
              <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.displayName || member.user.username}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {(member.user.displayName || member.user.username).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.displayName || member.user.username}
                    </p>
                    <p className="text-sm text-gray-500">
                      {member.role} • Joined {formatTeamDate(member.joinedAt)}
                    </p>
                  </div>
                </div>
                
                {canManageMembers(userRole) && member.role !== 'OWNER' && (
                  <div className="flex items-center space-x-2">
                    {canChangeRoles(userRole) && (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                        className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    )}
                    
                    {canRemoveMember(userRole, member.role) && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.role)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
