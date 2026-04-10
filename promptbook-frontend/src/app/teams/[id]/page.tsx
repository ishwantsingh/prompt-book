'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, withUserHeader, formatRelativeTime } from '@/lib/utils'
import { Team, TeamCollection } from '@/types/team'
import { formatTeamDate, formatMemberCount, formatCollectionCount, getTeamStats } from '@/lib/teamUtils'
import CollectionsSidebar from '@/components/sidebar/CollectionsSidebar'
import TeamInfoSidebar from '@/components/sidebar/TeamInfoSidebar'
import TeamSettingsModal from '@/components/modals/TeamSettingsModal'

interface Prompt {
  id: string
  slug: string
  title: string
  description: string
  prompt: string
  category: {
    id: string
    name: string
  }
  author: {
    id: string
    username: string
    displayName: string
  }
  upvotes: number
  downvotes: number
  bestScore: number
  createdAt: string
  subcategory?: { id: string; name: string; slug?: string } | null
}

interface VoteState {
  [promptId: string]: 'upvote' | 'downvote' | null
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
  }
  createdAt: string
  upvotes: number
  downvotes: number
  replies?: Comment[]
}

type ViewMode = 'card' | 'list'

export default function TeamDashboardPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamId = params.id as string
  
  // Get collection from URL params
  const collectionParam = searchParams.get('collection')
  
  const [team, setTeam] = useState<Team | null>(null)
  const [collections, setCollections] = useState<TeamCollection[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [promptsLoading, setPromptsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [voteStates, setVoteStates] = useState<VoteState>({})
  const [savedPrompts, setSavedPrompts] = useState<Record<string, boolean>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [voteCounts, setVoteCounts] = useState<Record<string, {upvotes: number, downvotes: number}>>({})
  const [promptComments, setPromptComments] = useState<Record<string, Comment[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  // Load team data
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
            
            // Load team collections
            const collectionsResponse = await apiFetch(`${baseUrl}/api/teams/${teamId}/collections`, withUserHeader({}, session.user.id))
            
            if (collectionsResponse.ok) {
              const collectionsData = await collectionsResponse.json()
              if (collectionsData.success && collectionsData.data) {
                setCollections(collectionsData.data)
              }
            }
          } else {
            setError(teamData.error || 'Team not found')
          }
        } else {
          const errorData = await teamResponse.json()
          setError(errorData.error || 'Failed to load team')
        }
      } catch (error) {
        console.error('Failed to load team data:', error)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadTeamData()
  }, [session, teamId])

  // Load prompts for selected collection
  useEffect(() => {
    const loadPrompts = async () => {
      if (!selectedCollection || !session?.user) {
        setPrompts([])
        return
      }

      try {
        setPromptsLoading(true)
        setError(null)

        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        const response = await apiFetch(
          `${baseUrl}/api/teams/${teamId}/collections/${selectedCollection}/prompts`,
          withUserHeader({}, session.user.id)
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setPrompts(data.data)
            
            // Load saved states and vote data for all prompts
            const promptIds = data.data.map((p: any) => p.id)
            await loadSavedStatesAndVotes(promptIds)
          } else {
            setError('Failed to load prompts')
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load prompts')
        }
      } catch (err) {
        console.error('Error loading prompts:', err)
        setError('Failed to load prompts')
      } finally {
        setPromptsLoading(false)
      }
    }

    loadPrompts()
  }, [selectedCollection, session, teamId])

  // Load saved states and vote data for prompts
  const loadSavedStatesAndVotes = useCallback(async (promptIds: string[]) => {
    if (promptIds.length === 0) return

    try {
      // Load saved states (only when logged in)
      if (session?.user) {
        const savedResponse = await apiFetch(`/api/prompts/favorites?promptIds=${promptIds.join(',')}`, withUserHeader({}, session.user.id))
        if (savedResponse.ok) {
          const savedData = await savedResponse.json()
          if (savedData.success && savedData.data) {
            const newSavedStates: Record<string, boolean> = {}
            Object.entries(savedData.data).forEach(([promptId, data]: [string, any]) => {
              newSavedStates[promptId] = (data as any).isFavorite
            })
            setSavedPrompts(newSavedStates)
          }
        }
      }

      // Load vote data (always, regardless of auth status)
      const voteResponse = await apiFetch(`/api/prompts/votes?promptIds=${promptIds.join(',')}`, withUserHeader({}, session?.user?.id))
      if (voteResponse.ok) {
        const voteData = await voteResponse.json()
        if (voteData.success && voteData.data) {
          const newVoteStates: Record<string, 'upvote' | 'downvote' | null> = {}
          const newVoteCounts: Record<string, {upvotes: number, downvotes: number}> = {}
          
          Object.entries(voteData.data).forEach(([promptId, data]: [string, any]) => {
            // Only set user vote state if logged in
            if (session?.user) {
              newVoteStates[promptId] = (data as any).userVote
            }
            newVoteCounts[promptId] = {
              upvotes: (data as any).upvotes,
              downvotes: (data as any).downvotes
            }
          })
          
          // Only update vote states if logged in
          if (session?.user) {
            setVoteStates(newVoteStates)
          }
          setVoteCounts(newVoteCounts)
        }
      }
    } catch (error) {
      console.error('Failed to load saved states and votes:', error)
    }
  }, [session])

  // Handle collection parameter from URL
  useEffect(() => {
    if (collectionParam && collections.length > 0) {
      const collection = collections.find(c => c.id === collectionParam)
      if (collection) {
        setSelectedCollection(collectionParam)
      }
    }
  }, [collectionParam, collections])

  const handleCollectionSelect = (collectionId: string) => {
    setSelectedCollection(collectionId)
  }

  const handleClearSelection = () => {
    setSelectedCollection('')
    setPrompts([])
  }

  const handleCreatePrompt = () => {
    if (!selectedCollection) return
    
    // Navigate to create prompt page with collection context
    router.push(`/prompts/create?teamId=${teamId}&collectionId=${selectedCollection}`)
  }

  const handleVote = async (promptId: string, voteType: 'upvote' | 'downvote') => {
    if (!session?.user) {
      alert('Please sign in to vote')
      return
    }

    const currentVote = voteStates[promptId]
    let newVote: 'upvote' | 'downvote' | null = voteType

    // If clicking the same vote type, remove the vote
    if (currentVote === voteType) {
      newVote = null
    }

    // Update vote state
    setVoteStates(prev => ({
      ...prev,
      [promptId]: newVote
    }))

    // Update vote counts
    const prompt = prompts.find((p: any) => p.id === promptId)
    if (prompt) {
      const currentCounts = voteCounts[promptId] || { upvotes: prompt.upvotes, downvotes: prompt.downvotes }
      let newUpvotes = currentCounts.upvotes
      let newDownvotes = currentCounts.downvotes

      // Calculate new counts based on vote changes
      if (currentVote === 'upvote' && newVote === null) {
        newUpvotes--
      } else if (currentVote === 'downvote' && newVote === null) {
        newDownvotes--
      } else if (currentVote === 'upvote' && newVote === 'downvote') {
        newUpvotes--
        newDownvotes++
      } else if (currentVote === 'downvote' && newVote === 'upvote') {
        newDownvotes--
        newUpvotes++
      } else if (currentVote === null && newVote === 'upvote') {
        newUpvotes++
      } else if (currentVote === null && newVote === 'downvote') {
        newDownvotes++
      }

      setVoteCounts(prev => ({
        ...prev,
        [promptId]: { upvotes: newUpvotes, downvotes: newDownvotes }
      }))
    }

    // API call
    try {
      const response = await apiFetch(`/api/prompts/${promptId}/vote`, withUserHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      }, session.user.id))

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Update vote state and counts from server response
          setVoteStates(prev => ({
            ...prev,
            [promptId]: result.data.voteType
          }))
          setVoteCounts(prev => ({
            ...prev,
            [promptId]: {
              upvotes: result.data.upvotes,
              downvotes: result.data.downvotes
            }
          }))
        }
        console.log('Vote successful')
      } else {
        // Revert optimistic update on error
        setVoteStates(prev => ({
          ...prev,
          [promptId]: currentVote
        }))
        if (prompt) {
          setVoteCounts(prev => ({
            ...prev,
            [promptId]: { upvotes: prompt.upvotes, downvotes: prompt.downvotes }
          }))
        }
      }
    } catch (error) {
      // Revert optimistic update on error
      setVoteStates(prev => ({
        ...prev,
        [promptId]: currentVote
      }))
      if (prompt) {
        setVoteCounts(prev => ({
          ...prev,
          [promptId]: { upvotes: prompt.upvotes, downvotes: prompt.downvotes }
        }))
      }
      console.log('Vote failed (demo mode)')
    }
  }

  const handleSave = async (promptId: string) => {
    if (!session?.user) {
      alert('Please sign in to save prompts')
      return
    }

    const isSaved = savedPrompts[promptId]

    setSavedPrompts(prev => ({
      ...prev,
      [promptId]: !isSaved
    }))

    try {
      const response = await apiFetch(`/api/prompts/${promptId}/favorite`, withUserHeader({
        method: isSaved ? 'DELETE' : 'POST'
      }, session.user.id))

      if (response.ok) {
        console.log('Save updated')
      }
    } catch (error) {
      console.log('Save failed (demo mode)')
    }
  }

  const handleCardClick = (prompt: Prompt) => {
    // Use slug for better SEO URLs
    router.push(`/prompts/${prompt.slug}`)
  }

  const fetchComments = async (promptId: string) => {
    if (promptComments[promptId] || loadingComments[promptId]) {
      return // Already loaded or loading
    }

    setLoadingComments(prev => ({ ...prev, [promptId]: true }))

    try {
      const response = await apiFetch(`/api/prompts/${promptId}/comments`, withUserHeader({}, session?.user?.id))
      if (response.ok) {
        const data = await response.json()
        const comments = data.data || []
        
        setPromptComments(prev => ({
          ...prev,
          [promptId]: comments
        }))
      }
    } catch (error) {
      console.log('Failed to load comments for prompt', promptId)
      // Set empty array on error
      setPromptComments(prev => ({
        ...prev,
        [promptId]: []
      }))
    } finally {
      setLoadingComments(prev => ({ ...prev, [promptId]: false }))
    }
  }

  const handleComments = async (promptId: string) => {
    const isCurrentlyShown = showComments[promptId]
    
    setShowComments(prev => ({
      ...prev,
      [promptId]: !isCurrentlyShown
    }))

    // Fetch comments when opening the section
    if (!isCurrentlyShown) {
      await fetchComments(promptId)
    }
  }

  const handleCopy = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt)
      alert('Prompt copied to clipboard!')
    } catch (error) {
      alert('Failed to copy prompt')
    }
  }

  const handleShare = async (prompt: Prompt) => {
    const shareData = {
      title: prompt.title,
      text: prompt.description,
      url: `${window.location.origin}/prompts/${prompt.slug}`
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareData.url)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.log('Share failed')
    }
  }

  // Filter prompts based on search term
  const filteredPrompts = useMemo(() => {
    if (!searchTerm) return prompts
    
    return prompts.filter(prompt => 
      prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [prompts, searchTerm])

  const CardView = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      {filteredPrompts.map((prompt: Prompt) => (
        <div 
          key={prompt.id} 
          className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-200 cursor-pointer group min-h-[24rem] flex flex-col"
          onClick={() => handleCardClick(prompt)}
        >
          <div className="p-6 flex-1 flex flex-col">
            {/* Main Content - grows to fill space */}
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {prompt.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{prompt.description}</p>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                    {prompt.category.name}
                  </span>
                  <span>by <Link href={`/users/${prompt.author.id}`} className="text-blue-600 hover:text-blue-800 font-medium" onClick={(e) => e.stopPropagation()}>{prompt.author.displayName}</Link></span>
                </div>
              </div>
              
              {/* Save Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave(prompt.id)
                }}
                className={`p-2 rounded-md transition-colors ${
                  savedPrompts[prompt.id] 
                    ? 'text-blue-600 bg-blue-50 hover:text-blue-700' 
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={savedPrompts[prompt.id] ? 'Remove from saved' : 'Save prompt'}
              >
                <svg className="w-4 h-4" fill={savedPrompts[prompt.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {/* Prompt Preview */}
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono line-clamp-3">
                {prompt.prompt}
              </pre>
            </div>

            {/* Subcategory */}
            <div className="flex flex-wrap gap-1 mb-4">
              {prompt.subcategory && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                  {prompt.subcategory.name}
                </span>
              )}
            </div>
          </div>

            {/* Stats and Actions - always at bottom */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4">
                {/* Voting */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVote(prompt.id, 'upvote')
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      voteStates[prompt.id] === 'upvote'
                        ? 'bg-green-100 text-green-700'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {voteCounts[prompt.id]?.upvotes ?? prompt.upvotes}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVote(prompt.id, 'downvote')
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      voteStates[prompt.id] === 'downvote'
                        ? 'bg-red-100 text-red-700'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {voteCounts[prompt.id]?.downvotes ?? prompt.downvotes}
                  </button>
                </div>

                {/* Comments */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleComments(prompt.id)
                  }}
                  className="text-xs text-gray-600 hover:text-blue-600 transition-colors"
                >
                  💬 Comments
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(prompt)
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  title="Copy prompt"
                >
                  📋
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShare(prompt)
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  title="Share prompt"
                >
                  🔗
                </button>
                <span className={`text-xs font-medium ${typeof prompt.bestScore === 'number' ? 'text-purple-600' : 'text-gray-400'}`}>
                  {typeof prompt.bestScore === 'number' ? `${Math.round(prompt.bestScore)}` : 'No score yet'}
                </span>
              </div>
            </div>

            {/* Comments Section */}
            {showComments[prompt.id] && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {loadingComments[prompt.id] ? (
                  <div className="text-sm text-gray-600">Loading comments...</div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">
                      {promptComments[prompt.id]?.length > 0 ? 'Recent comments:' : 'No comments yet'}
                    </div>
                    <div className="space-y-2">
                      {promptComments[prompt.id]?.slice(0, 2).map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                          <Link href={`/users/${comment.author.id}`} className="font-medium text-gray-800 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                            {comment.author.displayName}:
                          </Link>{' '}
                          {comment.content.length > 100 
                            ? `${comment.content.substring(0, 100)}...` 
                            : comment.content
                          }
                        </div>
                      ))}
                      {promptComments[prompt.id]?.length === 0 && (
                        <div className="text-xs text-gray-500 italic">
                          Be the first to comment on this prompt!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const ListView = () => (
    <div className="space-y-4">
      {filteredPrompts.map((prompt: Prompt) => (
        <div 
          key={prompt.id} 
          className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleCardClick(prompt)}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                  {prompt.title}
                </h3>
                <p className="text-gray-600 mb-3">{prompt.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                    {prompt.category.name}
                  </span>
                  <span>by <Link href={`/users/${prompt.author.id}`} className="text-blue-600 hover:text-blue-800 font-medium" onClick={(e) => e.stopPropagation()}>{prompt.author.displayName}</Link></span>
                  <span>{formatRelativeTime(prompt.createdAt)}</span>
                  <span className="font-medium text-purple-600">Score: {prompt.bestScore}</span>
                </div>
              </div>
              
              {/* Save Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave(prompt.id)
                }}
                className={`p-2 rounded-md transition-colors ${
                  savedPrompts[prompt.id] 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-400 hover:text-blue-600'
                }`}
              >
                <svg className="w-5 h-5" fill={savedPrompts[prompt.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>

            {/* Prompt Content */}
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono line-clamp-4">
                {prompt.prompt}
              </pre>
            </div>

            {/* Subcategory */}
            <div className="flex flex-wrap gap-2 mb-4">
              {prompt.subcategory && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                  {prompt.subcategory.name}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Voting */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVote(prompt.id, 'upvote')
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                      voteStates[prompt.id] === 'upvote'
                        ? 'bg-green-100 text-green-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {voteCounts[prompt.id]?.upvotes ?? prompt.upvotes}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleVote(prompt.id, 'downvote')
                    }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                      voteStates[prompt.id] === 'downvote'
                        ? 'bg-red-100 text-red-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {voteCounts[prompt.id]?.downvotes ?? prompt.downvotes}
                  </button>
                </div>

                {/* Comments Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleComments(prompt.id)
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  💬 Comments
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(prompt)
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  📋 Copy
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleShare(prompt)
                  }}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  🔗 Share
                </button>
              </div>
            </div>

            {/* Comments Section */}
            {showComments[prompt.id] && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {loadingComments[prompt.id] ? (
                  <div className="text-sm text-gray-600">Loading comments...</div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">
                      {promptComments[prompt.id]?.length > 0 ? 'Recent comments:' : 'No comments yet'}
                    </div>
                    <div className="space-y-2">
                      {promptComments[prompt.id]?.slice(0, 2).map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-2 rounded text-xs">
                          <Link href={`/users/${comment.author.id}`} className="font-medium text-gray-800 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>
                            {comment.author.displayName}:
                          </Link>{' '}
                          {comment.content.length > 100 
                            ? `${comment.content.substring(0, 100)}...` 
                            : comment.content
                          }
                        </div>
                      ))}
                      {promptComments[prompt.id]?.length === 0 && (
                        <div className="text-xs text-gray-500 italic">
                          Be the first to comment on this prompt!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in required</h1>
          <p className="text-gray-600 mb-6">Please sign in to view team details.</p>
          <Link 
            href="/auth/signin" 
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading team...</span>
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Team not found</h1>
          <p className="text-gray-600 mb-6">{error || 'The team you\'re looking for doesn\'t exist.'}</p>
          <Link 
            href="/teams" 
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 pb-20 pt-4 md:px-0 md:py-6 space-y-4">
        <div className="space-y-1 px-1 md:px-6">
          <h1 className="text-xl font-semibold text-gray-900 md:text-2xl">{team.name}</h1>
          <p className="text-sm text-gray-500">Created {formatTeamDate(team.createdAt)}</p>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[320px,1fr] md:items-start">
          <div className="space-y-3 md:sticky md:top-24 md:self-start md:ml-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Collections</h2>
              <p className="mt-1 text-xs text-gray-500">Organize prompts into shared collections for your team.</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link
                  href={`/teams/${team.slug}/collections/create`}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  New Collection
                </Link>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage Collections
                </button>
              </div>
            </div>

            <CollectionsSidebar
              teamId={teamId}
              selectedCollection={selectedCollection}
              onCollectionSelect={handleCollectionSelect}
              onClearSelection={handleClearSelection}
            />
          </div>

          <section className="space-y-6 md:pr-6">
            {/* Filters */}
            <div className="sticky top-[58px] z-20 mb-4 border-b border-gray-200 bg-white/95 px-3 py-3 backdrop-blur md:mb-6 md:rounded-2xl md:border md:px-6 md:py-4 md:shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm md:flex-[1.5_1_0%]">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3-3" />
                  </svg>
                  <input
                    id="search"
                    type="search"
                    placeholder="Search prompts"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-7 flex-1 border-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex w-full flex-col gap-2 md:flex-[2_1_0%] md:flex-row md:items-center md:justify-end md:gap-3">
                  <div className="flex items-center justify-between gap-2 md:hidden">
                    <div className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm">
                      {selectedCollection ? filteredPrompts.length : prompts.length} prompts
                    </div>
                    <div className="flex overflow-hidden rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-600 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-2 py-1 transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        className={`px-2 py-1 transition ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                      >
                        Cards
                      </button>
                    </div>
                  </div>

                  <div className="hidden md:flex flex-1 items-center justify-end gap-3">
                    <div className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                      >
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        className={`px-3 py-1.5 transition ${viewMode === 'card' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`}
                      >
                        Cards
                      </button>
                    </div>
                    {selectedCollection && (
                      <button
                        onClick={handleCreatePrompt}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Prompt
                      </button>
                    )}
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Manage Team
                    </button>
                    <Link
                      href="/teams"
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      All Teams
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="px-3 md:px-0">
              <p className="text-sm text-gray-600">
                {selectedCollection ? (
                  <>
                    Found {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
                    {searchTerm && ` matching "${searchTerm}"`}
                    {' in '}
                    {collections.find(c => c.id === selectedCollection)?.name || 'selected collection'}
                  </>
                ) : (
                  'Select a collection to view its prompts.'
                )}
              </p>
            </div>

            {/* Prompts */}
            <div className="px-3 md:px-0">
              {promptsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
                  <span className="ml-2 text-gray-600">Loading prompts...</span>
                </div>
              ) : !selectedCollection ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-gray-400">📁</div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Select a collection</h3>
                  <p className="text-gray-600">Choose a collection from the sidebar to view its prompts.</p>
                </div>
              ) : viewMode === 'card' ? (
                <CardView />
              ) : (
                <ListView />
              )}

              {!promptsLoading && selectedCollection && filteredPrompts.length === 0 && (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-gray-400">🔍</div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No prompts found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? 'Try adjusting your search criteria.' : 'This collection is empty.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <TeamSettingsModal
        team={team}
        teamId={teamId}
        userId={session?.user?.id || ''}
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  )
}

