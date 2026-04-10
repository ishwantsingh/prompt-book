'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime, apiFetch } from '@/lib/utils'

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

interface UserProfile {
  id: string
  username: string
  displayName: string
  avatarUrl?: string
  bio?: string
  reputationScore: number
  createdAt: string
  stats: {
    promptsCount: number
    totalUpvotes: number
    totalDownvotes: number
    avgScore: number
    commentsCount: number
  }
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<UserProfile | null>(null)
  const [userPrompts, setUserPrompts] = useState<UserPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [voteCounts, setVoteCounts] = useState<Record<string, { upvotes: number, downvotes: number }>>({})

  // Fetch real-time vote counts for all prompts
  const fetchVoteCounts = async (promptIds: string[]) => {
    if (promptIds.length === 0) return
    
    try {
      const response = await apiFetch(`/api/prompts/votes?promptIds=${promptIds.join(',')}`)
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
  }

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load user profile data
        const userResponse = await apiFetch(`/api/users/${userId}`)
        if (!userResponse.ok) {
          if (userResponse.status === 404) {
            setError('User not found')
          } else {
            setError('Failed to load user profile')
          }
          return
        }

        const userData = await userResponse.json()
        if (userData.success && userData.data) {
          setUser(userData.data)
        }

        // Load user's prompts
        const promptsResponse = await apiFetch(`/api/users/${userId}/prompts`)
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
            
            // Fetch real-time vote counts for all prompts
            const promptIds = transformedPrompts.map((p: UserPrompt) => p.id)
            await fetchVoteCounts(promptIds)
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      loadUserProfile()
    }
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error || 'User Not Found'}</h1>
          <p className="text-gray-600 mb-4">The user profile you&apos;re looking for doesn&apos;t exist.</p>
          <Link 
            href="/prompts"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Prompts
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>→</span>
          <Link href="/prompts" className="hover:text-blue-600">Prompts</Link>
          <span>→</span>
          <span>{user.displayName || user.username}</span>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border p-8 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              {user.avatarUrl ? (
                <Image 
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-blue-600 font-bold text-2xl">
                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {user.displayName || user.username}
              </h1>
              <p className="text-gray-600 mb-4">@{user.username}</p>
              {user.bio && (
                <p className="text-gray-600 text-sm mb-6">{user.bio}</p>
              )}
              <p className="text-gray-500 text-sm mb-6">
                Member since {formatRelativeTime(user.createdAt)}
              </p>

              {/* User Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{user.stats.promptsCount}</div>
                  <div className="text-sm text-gray-600">Prompts Created</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{user.stats.totalUpvotes}</div>
                  <div className="text-sm text-gray-600">Total Upvotes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{user.stats.avgScore}</div>
                  <div className="text-sm text-gray-600">Avg Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Prompts Section */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {(user.displayName || user.username)}&apos;s Prompts ({userPrompts.length})
            </h2>
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
                <p className="text-gray-600">This user hasn&apos;t created any public prompts yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link 
            href="/prompts"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            ← Back to Prompts
          </Link>
        </div>
      </div>
    </div>
  )
}
