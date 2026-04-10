'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { apiFetch, withUserHeader } from '@/lib/utils'
import { Team, TeamFilters } from '@/types/team'
import { formatTeamDate, formatMemberCount, formatCollectionCount, canJoinTeam, isTeamMember } from '@/lib/teamUtils'
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'

export default function TeamsPage() {
  const { data: session } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<TeamFilters>({
    type: 'all',
    search: '',
    limit: 20,
    offset: 0
  })
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Load teams
  useEffect(() => {
    const loadTeams = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const params = new URLSearchParams()
        
        if (filters.type) params.append('type', filters.type)
        if (filters.search) params.append('search', filters.search)
        if (filters.limit) params.append('limit', filters.limit.toString())
        if (filters.offset) params.append('offset', filters.offset.toString())

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        const apiUrl = `${baseUrl}/api/teams${params.toString() ? `?${params.toString()}` : ''}`
        
        const response = await apiFetch(apiUrl, withUserHeader({}, session.user.id))
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setTeams(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to load teams:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTeams()
  }, [session, filters])

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, offset: 0 }))
  }

  const handleTypeChange = (type: 'user' | 'public' | 'all') => {
    setFilters(prev => ({ ...prev, type, offset: 0 }))
  }

  const totalTeams = teams.length
  const myTeamsCount = useMemo(() => teams.filter(team => isTeamMember(team, session?.user?.id || '')).length, [teams, session?.user?.id])
  const publicTeamsCount = useMemo(() => teams.filter(team => team.isPublic).length, [teams])

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <UserGroupIcon className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Sign in required</h1>
          <p className="text-sm text-gray-600">Please sign in to view and manage your teams.</p>
          <Link
            href="/auth/signin"
            className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-3 pb-20 pt-4 md:px-6 md:pt-8">
        {/* Filters */}
        <section className="sticky top-[58px] z-20 mb-3 border-b border-gray-200 bg-white/95 px-3 py-2 md:mb-6 md:px-6 md:py-4 backdrop-blur md:static md:rounded-2xl md:border md:shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:pb-0 md:items-end md:gap-4">
            <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm md:w-1/2 md:max-w-sm md:flex-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search teams…"
                value={filters.search || ''}
                onChange={(event) => handleSearch(event.target.value)}
                className="h-7 flex-1 border-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => handleSearch('')}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex w-full items-center gap-2 md:hidden">
              <select
                id="mobile-type"
                value={filters.type || 'all'}
                onChange={(event) => handleTypeChange(event.target.value as 'user' | 'public' | 'all')}
                className="w-full rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All teams</option>
                <option value="user">My teams</option>
                <option value="public">Public teams</option>
              </select>
            </div>

            <Link
              href="/teams/create"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 md:hidden"
            >
              <SparklesIcon className="h-4 w-4" />
              Create Team
            </Link>

            <div className="hidden md:flex flex-1 items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="type" className="text-xs font-medium text-gray-600">Team type</label>
                <select
                  id="type"
                  value={filters.type || 'all'}
                  onChange={(event) => handleTypeChange(event.target.value as 'user' | 'public' | 'all')}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All teams</option>
                  <option value="user">My teams</option>
                  <option value="public">Public teams</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
                  <UserGroupIcon className="h-4 w-4 text-blue-600" />
                  {myTeamsCount} my teams
                </div>
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
                  <SparklesIcon className="h-4 w-4 text-purple-500" />
                  {publicTeamsCount} public
                </div>
                <Link
                  href="/teams/create"
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <SparklesIcon className="h-4 w-4" />
                  Create Team
                </Link>
              </div>
            </div>
          </div>

          {isFilterSheetOpen && null}
        </section>

        {/* Teams Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
            <p className="text-gray-600 mb-6">
              {filters.search 
                ? `No teams match "${filters.search}"`
                : filters.type === 'user'
                ? "You haven't joined any teams yet"
                : "No public teams available"
              }
            </p>
            {filters.type === 'user' && (
              <Link
                href="/teams/create"
                className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Your First Team
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TeamCardProps {
  team: Team
}

function TeamCard({ team }: TeamCardProps) {
  const { data: session } = useSession()
  const [isJoining, setIsJoining] = useState(false)

  const handleJoinTeam = async () => {
    if (!session?.user || !team?.isPublic) return

    try {
      setIsJoining(true)
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await apiFetch(
        `${baseUrl}/api/teams/${team.slug}/join`,
        withUserHeader({
          method: 'POST'
        }, session.user.id)
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Reload page to show updated membership
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

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isTeamMember(team, session?.user?.id || '') ? (
                <Link 
                  href={`/teams/${team.slug}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {team.name}
                </Link>
              ) : (
                <span className="text-gray-900">{team.name}</span>
              )}
            </h3>
            {team.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {team.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {team.isPublic ? (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                Public
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-md">
                Private
              </span>
            )}
          </div>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            {team.owner.avatarUrl ? (
              <img
                src={team.owner.avatarUrl}
                alt={team.owner.displayName || team.owner.username}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <span className="text-sm font-medium text-gray-600">
                {(team.owner.displayName || team.owner.username).charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">
              Owned by{' '}
              <Link 
                href={`/users/${team.owner.id}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {team.owner.displayName || team.owner.username}
              </Link>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span>{formatMemberCount(team._count.members)}</span>
          <span>{formatCollectionCount(team._count.collections)}</span>
          <span>{formatTeamDate(team.createdAt)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isTeamMember(team, session?.user?.id || '') ? (
            <Link
              href={`/teams/${team.slug}`}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-center text-sm font-medium"
            >
              View Team
            </Link>
          ) : team.isPublic && canJoinTeam(team, session?.user?.id || '') ? (
            <button 
              onClick={handleJoinTeam}
              disabled={isJoining}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 'Join Team'}
            </button>
          ) : (
            <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-500 rounded-md text-center text-sm font-medium">
              {team.isPublic ? 'Already a member' : 'Private Team'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
