'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatRelativeTime, apiFetch, withUserHeader } from '@/lib/utils'
import ActivityFeed from '@/components/activity/ActivityFeed'
import { Team } from '@/types/team'
import { formatTeamDate } from '@/lib/teamUtils'

interface UserPrompt {
  id: string
  slug: string
  title: string
  description: string
  category: {
    id: string
    name: string
  }
  upvotes: number
  downvotes: number
  bestScore: number
  createdAt: string
  subcategory?: { id: string; name: string; slug?: string } | null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [userPrompts, setUserPrompts] = useState<UserPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [voteCounts, setVoteCounts] = useState<Record<string, { upvotes: number, downvotes: number }>>({})
  const [userTeams, setUserTeams] = useState<Team[]>([])

  // Fetch real-time vote counts for all prompts
  const fetchVoteCounts = useCallback(async (promptIds: string[]) => {
    if (promptIds.length === 0) return
    
    try {
      const response = await apiFetch(`/api/prompts/votes?promptIds=${promptIds.join(',')}`, withUserHeader({}, session?.user?.id || ''))
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          const counts: Record<string, { upvotes: number, downvotes: number }> = {}
          Object.entries(data.data).forEach(([promptId, voteData]: [string, any]) => {
            counts[promptId] = {
              upvotes: voteData.upvotes,
              downvotes: voteData.downvotes
            }
          })
          setVoteCounts(counts)
        }
      }
    } catch (error) {
      console.error('Failed to fetch vote counts:', error)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    const loadUserData = async () => {
      try {
        setLoading(true)
        
        // Load user's prompts from database
        const promptsResponse = await apiFetch('${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/prompts', withUserHeader({}, session.user.id))
        if (promptsResponse.ok) {
          const promptsData = await promptsResponse.json()
          if (promptsData.success && promptsData.data) {
            // Transform database data to match interface
            const transformedPrompts = promptsData.data.map((p: any) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              description: p.description,
              category: {
                id: p.category.id,
                name: p.category.name
              },
              upvotes: p.upvotes,
              downvotes: p.downvotes,
              bestScore: p.bestScore,
              createdAt: p.createdAt,
              subcategory: p.subcategory ? { id: p.subcategory.id, name: p.subcategory.name, slug: p.subcategory.slug } : null
            }))
            setUserPrompts(transformedPrompts)
            // Fetch vote counts for all loaded prompts
            const promptIds = transformedPrompts.map((p: UserPrompt) => p.id)
            fetchVoteCounts(promptIds)
          }
        }

        // Load user's teams
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        const teamsResponse = await apiFetch(`${baseUrl}/api/teams?type=user`, withUserHeader({}, session.user.id))
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          if (teamsData.success && teamsData.data) {
            setUserTeams(teamsData.data)
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [session, status, router, fetchVoteCounts])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  const user = session.user
  const totalVotes = userPrompts.reduce((acc, prompt) => acc + (voteCounts[prompt.id]?.upvotes ?? prompt.upvotes) + (voteCounts[prompt.id]?.downvotes ?? prompt.downvotes), 0)
  const totalUpvotes = userPrompts.reduce((acc, prompt) => acc + (voteCounts[prompt.id]?.upvotes ?? prompt.upvotes), 0)
  const avgScore = userPrompts.length > 0 
    ? Math.round(userPrompts.reduce((acc, prompt) => acc + (prompt.bestScore || 0), 0) / userPrompts.length)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>→</span>
          <span>Profile</span>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <Image 
                  src={user.avatarUrl}
                  alt={user.displayName || user.name || 'User'}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-blue-600 font-bold text-2xl">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user.displayName || user.name || 'User'}
              </h1>
              <p className="text-gray-600 mb-4">@{user.username || 'user'}</p>
              <p className="text-gray-600 text-sm mb-6">{user.email}</p>

              {/* User Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{userPrompts.length}</div>
                  <div className="text-sm text-gray-600">Prompts Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalUpvotes}</div>
                  <div className="text-sm text-gray-600">Total Upvotes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{avgScore}</div>
                  <div className="text-sm text-gray-600">Avg Score</div>
                </div>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button 
              onClick={() => alert('Profile editing coming soon!')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          </div>
        </div>

        {/* Teams Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">My Teams</h2>
            <Link
              href="/teams"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All Teams
            </Link>
          </div>

          {userTeams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
              <p className="text-gray-600 mb-4">Join or create teams to collaborate with others.</p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/teams"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Browse Teams
                </Link>
                <Link
                  href="/teams/create"
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Create Team
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{team.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{team.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
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
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{team.members.length} members</span>
                    <span>Joined {formatTeamDate(team.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - User's Prompts Section */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">My Prompts</h2>
                <Link
                  href="/prompts/create"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Create New Prompt
                </Link>
              </div>
            </div>

            <div className="p-6">
              {userPrompts.length > 0 ? (
                <div className="space-y-4">
                  {userPrompts.map((prompt) => (
                    <div 
                      key={prompt.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <Link
                            href={`/prompts/${prompt.slug}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {prompt.title}
                          </Link>
                          <p className="text-gray-600 text-sm mt-1">{prompt.description}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-center">
                            <div className="text-green-600 font-medium">↑ {voteCounts[prompt.id]?.upvotes ?? prompt.upvotes}</div>
                            <div className="text-xs text-gray-500">upvotes</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-600 font-medium">{prompt.bestScore}</div>
                            <div className="text-xs text-gray-500">score</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                          {prompt.category.name}
                        </span>
                        <span>{formatRelativeTime(prompt.createdAt)}</span>
                        {prompt.subcategory && (
                          <div className="flex gap-1">
                            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                              {prompt.subcategory.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts yet</h3>
                  <p className="text-gray-600 mb-4">Start creating prompts to build your collection.</p>
                  <Link
                    href="/prompts/create"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Prompt
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Activity Feed */}
          <div className="bg-white rounded-xl shadow-sm border">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  )
}
