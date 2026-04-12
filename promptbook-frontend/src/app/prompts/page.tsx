'use client'

import { useState, useEffect, useMemo, useCallback, Fragment, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  HandThumbDownIcon,
  HandThumbUpIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  TagIcon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid'
import { BookmarkIcon as BookmarkOutlineIcon } from '@heroicons/react/24/outline'
import { formatRelativeTime, apiFetch, withUserHeader } from '@/lib/utils'
import CategorySidebar from '@/components/sidebar/CategorySidebar'

interface FilterState {
  search: string
  category: string
  subcategoryId?: string
  sortBy: 'recent' | 'popular' | 'score'
}

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

export default function PromptsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    subcategoryId: '',
    sortBy: 'score'
  })

  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [voteStates, setVoteStates] = useState<VoteState>({})
  const [savedPrompts, setSavedPrompts] = useState<Record<string, boolean>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [voteCounts, setVoteCounts] = useState<Record<string, {upvotes: number, downvotes: number}>>({})
  const [promptComments, setPromptComments] = useState<Record<string, Comment[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const loadSavedStatesAndVotes = useCallback(async (promptIds: string[]) => {
    if (promptIds.length === 0) return

    try {
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

      const voteResponse = await apiFetch(`/api/prompts/votes?promptIds=${promptIds.join(',')}`, withUserHeader({}, session?.user?.id))
      if (voteResponse.ok) {
        const voteData = await voteResponse.json()
        if (voteData.success && voteData.data) {
          const newVoteStates: Record<string, 'upvote' | 'downvote' | null> = {}
          const newVoteCounts: Record<string, {upvotes: number, downvotes: number}> = {}
          
          Object.entries(voteData.data).forEach(([promptId, data]: [string, any]) => {
            if (session?.user) {
              newVoteStates[promptId] = (data as any).userVote
            }
            newVoteCounts[promptId] = {
              upvotes: (data as any).upvotes,
              downvotes: (data as any).downvotes
            }
          })
          
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        const params = new URLSearchParams()
        if (filters.category) {
          params.append('categoryId', filters.category)
        }
        if (filters.subcategoryId) {
          params.append('subcategoryId', filters.subcategoryId)
        }
        if (filters.search) {
          params.append('q', filters.search)
        }
        params.append('sort', filters.sortBy)
        
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        const apiUrl = `${baseUrl}/api/prompts${params.toString() ? `?${params.toString()}` : ''}`
        
        if (allCategories.length === 0) {
          const categoriesResponse = await apiFetch(`${baseUrl}/api/categories`)
          if (categoriesResponse.ok) {
            const categoriesData = await categoriesResponse.json()
            if (categoriesData.success && categoriesData.data) {
              setAllCategories(categoriesData.data)
            }
          }
        }
        
        const promptsResponse = await apiFetch(apiUrl)
        if (promptsResponse.ok) {
          const promptsData = await promptsResponse.json()
          if (promptsData.success && promptsData.data) {
            const dbPrompts = promptsData.data.map((p: any) => ({
              id: p.id,
              slug: p.slug,
              title: p.title,
              description: p.description,
              prompt: p.content,
              category: {
                id: p.category.id,
                name: p.category.name
              },
              subcategory: p.subcategory ? { id: p.subcategory.id, name: p.subcategory.name, slug: p.subcategory.slug } : null,
              author: {
                id: p.author.id,
                username: p.author.username,
                displayName: p.author.displayName
              },
              upvotes: p.upvotes,
              downvotes: p.downvotes,
              bestScore: p.bestScore,
              createdAt: p.createdAt,
            }))
            setPrompts(dbPrompts)
            
            const uniqueCategories = dbPrompts.reduce((acc: any[], prompt: any) => {
              const existing = acc.find(cat => cat.id === prompt.category.id)
              if (!existing) {
                acc.push({
                  ...prompt.category,
                  _count: { prompts: 1 }
                })
              } else {
                existing._count.prompts++
              }
              return acc
            }, [])
            setCategories(uniqueCategories)

            const promptIds = dbPrompts.map((p: any) => p.id)
            await loadSavedStatesAndVotes(promptIds)
          }
        }
      } catch (error) {
        console.error('Failed to load data from database:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [filters, loadSavedStatesAndVotes, allCategories.length])

  useEffect(() => {
    if (session?.user && prompts.length > 0) {
      const promptIds = prompts.map((p: any) => p.id)
      loadSavedStatesAndVotes(promptIds)
    }
  }, [session, prompts, loadSavedStatesAndVotes])

  const filteredAndSortedPrompts = useMemo(() => {
    return prompts
  }, [prompts])

  const handleVote = async (promptId: string, voteType: 'upvote' | 'downvote') => {
    if (!session?.user) {
      alert('Please sign in to vote')
      return
    }

    const currentVote = voteStates[promptId]
    let newVote: 'upvote' | 'downvote' | null = voteType

    if (currentVote === voteType) {
      newVote = null
    }

    setVoteStates(prev => ({
      ...prev,
      [promptId]: newVote
    }))

    const prompt = prompts.find((p: any) => p.id === promptId)
    if (prompt) {
      const currentCounts = voteCounts[promptId] || { upvotes: prompt.upvotes, downvotes: prompt.downvotes }
      let newUpvotes = currentCounts.upvotes
      let newDownvotes = currentCounts.downvotes

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

    try {
      const response = await apiFetch(`/api/prompts/${promptId}/vote`, withUserHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      }, session.user.id))

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
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
      } else {
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
      void response
    } catch {
    }
  }

  const handleCardClick = (prompt: Prompt) => {
    router.push(`/prompts/${prompt.slug}`)
  }

  const fetchComments = async (promptId: string) => {
    if (promptComments[promptId] || loadingComments[promptId]) {
      return
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
    } catch {
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
    } catch {
    }
  }

  const renderDescription = (prompt: Prompt) => {
    const isExpanded = expandedDescriptions[prompt.id]
    const text = prompt.description || ''

    if (text.length <= 160) {
      return (
        <p className="text-gray-600 text-xs md:text-sm leading-snug">
          {text}
        </p>
      )
    }

    return (
      <div className="space-y-1">
        <p
          className={`text-gray-600 text-xs md:text-sm leading-snug transition-all duration-200 ${
            isExpanded ? 'line-clamp-none' : 'line-clamp-2'
          }`}
        >
          {text}
        </p>
        <button
          onClick={(event) => {
            event.stopPropagation()
            setExpandedDescriptions((prev) => ({
              ...prev,
              [prompt.id]: !isExpanded,
            }))
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? 'Show less' : 'Read more'}
          <ChevronDownIcon
            className={`w-3 h-3 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    )
  }

  const renderMetadataRow = (prompt: Prompt) => {
    const metadataItems: ReactNode[] = [
      (
        <span key="author" className="inline-flex items-center gap-1 min-w-0">
          <UserCircleIcon className="w-3.5 h-3.5" />
          <Link
            href={`/users/${prompt.author.id}`}
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-gray-700 hover:text-blue-600 truncate"
          >
            {prompt.author.displayName}
          </Link>
        </span>
      ),
      (
        <span key="time" className="inline-flex items-center gap-1">
          <ClockIcon className="w-3.5 h-3.5" />
          {formatRelativeTime(prompt.createdAt)}
        </span>
      ),
      typeof prompt.bestScore === 'number'
        ? (
            <span key="score" className="inline-flex items-center gap-1">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
              {Math.round(prompt.bestScore)}
            </span>
          )
        : null,
      (
        <span key="category" className="inline-flex items-center gap-1">
          <TagIcon className="w-3.5 h-3.5" />
          {prompt.category.name}
        </span>
      ),
      prompt.subcategory
        ? (
            <span key="subcategory" className="inline-flex items-center gap-1 text-gray-600">
              {prompt.subcategory.name}
            </span>
          )
        : null,
    ].filter(Boolean)

    return (
      <div className="mt-2 flex flex-wrap items-center text-[11px] md:text-xs text-gray-500">
        {metadataItems.map((item, index) => (
          <Fragment key={(item as { key?: string }).key ?? index}>
            {index > 0 && <span className="mx-2 text-gray-300">·</span>}
            {item}
          </Fragment>
        ))}
      </div>
    )
  }

  const renderActionsRow = (prompt: Prompt) => (
    <div className="mt-2 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleVote(prompt.id, 'upvote')
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] md:text-xs shadow-sm transition-colors ${
            voteStates[prompt.id] === 'upvote'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <HandThumbUpIcon className="w-3.5 h-3.5" />
          {voteCounts[prompt.id]?.upvotes ?? prompt.upvotes}
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleVote(prompt.id, 'downvote')
          }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] md:text-xs shadow-sm transition-colors ${
            voteStates[prompt.id] === 'downvote'
              ? 'bg-red-100 text-red-700'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <HandThumbDownIcon className="w-3.5 h-3.5" />
          {voteCounts[prompt.id]?.downvotes ?? prompt.downvotes}
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleComments(prompt.id)
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] md:text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5" />
          Comments
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleCopy(prompt)
          }}
          className="touch-target h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800"
        >
          <DocumentDuplicateIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            handleShare(prompt)
          }}
          className="touch-target h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-800"
        >
          <ShareIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  const renderSaveButton = (prompt: Prompt) => {
    const isSaved = savedPrompts[prompt.id]

    return (
      <button
        aria-label={isSaved ? 'Remove from saved prompts' : 'Save prompt'}
        onClick={(event) => {
          event.stopPropagation()
          handleSave(prompt.id)
        }}
        className={`touch-target h-9 w-9 rounded-full border transition-colors ${
          isSaved
            ? 'border-blue-100 bg-blue-50 text-blue-600'
            : 'border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'
        }`}
      >
        {isSaved ? (
          <BookmarkSolidIcon className="w-4 h-4" />
        ) : (
          <BookmarkOutlineIcon className="w-4 h-4" />
        )}
      </button>
    )
  }

  const renderPromptHeader = (prompt: Prompt) => (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 md:text-base">
          {prompt.title}
        </h3>
        {renderDescription(prompt)}
      </div>
      {renderSaveButton(prompt)}
    </div>
  )

  const renderPromptBody = (prompt: Prompt) => (
    <div className="mt-2 rounded-lg bg-gray-50 p-3 text-[11px] md:text-xs text-gray-700">
      <pre className="line-clamp-3 whitespace-pre-wrap font-mono leading-relaxed">
        {prompt.prompt}
      </pre>
    </div>
  )

  const renderCommentsSection = (prompt: Prompt) => (
    <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-[11px] md:text-xs text-gray-600">
      {loadingComments[prompt.id] ? (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="h-3 w-3 animate-spin rounded-full border-b-2 border-gray-300" />
          Loading comments...
        </div>
      ) : promptComments[prompt.id]?.length ? (
        <div className="space-y-2">
          {promptComments[prompt.id]?.slice(0, 2).map((comment) => (
            <div key={comment.id} className="rounded-lg bg-white p-2">
              <Link
                href={`/users/${comment.author.id}`}
                onClick={(event) => event.stopPropagation()}
                className="font-medium text-gray-800 hover:text-blue-600"
              >
                {comment.author.displayName}
              </Link>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                {comment.content.length > 120
                  ? `${comment.content.substring(0, 120)}...`
                  : comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] italic text-gray-500">
          Be the first to comment on this prompt!
        </div>
      )}
    </div>
  )

  const CardView = () => (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
      {filteredAndSortedPrompts.map((prompt: Prompt) => (
        <div
          key={prompt.id}
          className="flex min-h-[14rem] flex-col rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          onClick={() => handleCardClick(prompt)}
        >
          {renderPromptHeader(prompt)}
          {renderPromptBody(prompt)}
          {renderMetadataRow(prompt)}
          {renderActionsRow(prompt)}
          {showComments[prompt.id] && renderCommentsSection(prompt)}
        </div>
      ))}
    </div>
  )

  const ListView = () => (
    <div className="space-y-2.5">
      {filteredAndSortedPrompts.map((prompt: Prompt) => (
        <div
          key={prompt.id}
          className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          onClick={() => handleCardClick(prompt)}
        >
          {renderPromptHeader(prompt)}
          {renderPromptBody(prompt)}
          {renderMetadataRow(prompt)}
          {renderActionsRow(prompt)}
          {showComments[prompt.id] && renderCommentsSection(prompt)}
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-3 pb-20 pt-4 md:px-0 md:py-6">
        {/* Mobile filter bar */}
        <div className="md:hidden">
          <div className="sticky top-[58px] z-20 -mx-3 border-b border-gray-200 bg-white/95 px-3 py-2 backdrop-blur">
            <div className="flex flex-col gap-2">
              <div className="flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  id="search"
                  placeholder="Search prompts"
                  value={filters.search}
                  onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                  className="h-7 flex-1 border-none bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
                <span className="inline-flex min-w-[2.5rem] items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                  {filteredAndSortedPrompts.length}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  Filters
                </button>
                <div className="relative inline-flex">
                  <select
                    value={filters.sortBy}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, sortBy: event.target.value as FilterState['sortBy'] }))
                    }
                    className="appearance-none rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm"
                  >
                    <option value="recent">Recent</option>
                    <option value="popular">Popular</option>
                    <option value="score">Score</option>
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>

            {isMobileFiltersOpen && (
              <div className="mt-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
                <CategorySidebar
                  selectedCategory={filters.category}
                  selectedSubcategory={filters.subcategoryId}
                  onCategorySelect={(categoryId) =>
                    setFilters((prev) => ({ ...prev, category: categoryId, subcategoryId: '' }))
                  }
                  onSubcategorySelect={(categoryId, subcategoryId) =>
                    setFilters((prev) => ({ ...prev, category: categoryId, subcategoryId }))
                  }
                  onClearFilters={() => setFilters((prev) => ({ ...prev, category: '', subcategoryId: '' }))}
                  className="border-0 p-0"
                />
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Collapse
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-gray-500">
            {filters.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                Category
                <span className="text-blue-900">
                  {allCategories.find((cat: any) => cat.id === filters.category)?.name || 'Selected'}
                </span>
              </span>
            )}
            {filters.subcategoryId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 font-medium text-purple-700">
                Subcategory
                <span className="text-purple-900">
                  {allCategories
                    .find((cat: any) => cat.id === filters.category)
                    ?.subcategories?.find((sub: any) => sub.id === filters.subcategoryId)?.name || 'Selected'}
                </span>
              </span>
            )}
            {filters.search && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600">
                Search “{filters.search}”
              </span>
            )}
            {filteredAndSortedPrompts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-600">
                Sorted by {filters.sortBy}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <aside className="hidden md:block md:col-span-1">
            <CategorySidebar
              selectedCategory={filters.category}
              selectedSubcategory={filters.subcategoryId}
              onCategorySelect={(categoryId) =>
                setFilters((prev) => ({ ...prev, category: categoryId, subcategoryId: '' }))
              }
              onSubcategorySelect={(categoryId, subcategoryId) =>
                setFilters((prev) => ({ ...prev, category: categoryId, subcategoryId }))
              }
              onClearFilters={() => setFilters((prev) => ({ ...prev, category: '', subcategoryId: '' }))}
              className="h-fit md:sticky md:top-16 md:self-start md:ml-6 shadow-sm"
            />
          </aside>

          <section className="md:col-span-3 md:pr-6">
            <div className="hidden md:block">
              <div className="mb-4 rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-end gap-3">
                  <div className="basis-[70%]">
                    <label htmlFor="desktop-search" className="mb-1 block text-sm font-medium text-gray-700">
                      Search
                    </label>
                    <input
                      id="desktop-search"
                      type="text"
                      placeholder="Search prompts..."
                      value={filters.search}
                      onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="basis-[25%]">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value as FilterState['sortBy'] }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="recent">🕒 Most Recent</option>
                      <option value="popular">🔥 Most Popular</option>
                      <option value="score">⭐ Highest Score</option>
                    </select>
                  </div>
                  <div className="basis-[5%]">
                    <label className="mb-1 block text-sm font-medium text-gray-700">View</label>
                    <div className="flex overflow-hidden rounded-md border border-gray-300">
                      <button
                        aria-label="List view"
                        onClick={() => setViewMode('list')}
                        className={`flex-1 px-2 py-2 text-sm transition-colors ${
                          viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <button
                        aria-label="Card view"
                        onClick={() => setViewMode('card')}
                        className={`flex-1 px-2 py-2 text-sm transition-colors ${
                          viewMode === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="8" height="8" rx="1" />
                          <rect x="13" y="3" width="8" height="8" rx="1" />
                          <rect x="3" y="13" width="8" height="8" rx="1" />
                          <rect x="13" y="13" width="8" height="8" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Found {filteredAndSortedPrompts.length} prompt{filteredAndSortedPrompts.length !== 1 ? 's' : ''}
                  {filters.search && ` matching "${filters.search}"`}
                  {filters.category && (() => {
                    const category = allCategories.find((c: any) => c.id === filters.category)
                    return category ? ` in ${category.name}` : ''
                  })()}
                  {filters.subcategoryId && (() => {
                    const category = allCategories.find((c: any) => c.id === filters.category)
                    const subcategory = category?.subcategories?.find((s: any) => s.id === filters.subcategoryId)
                    return subcategory ? ` → ${subcategory.name}` : ''
                  })()}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Loading prompts...</span>
                </div>
              ) : filteredAndSortedPrompts.length > 0 ? (
                viewMode === 'card' ? <CardView /> : <ListView />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
                  <div className="mb-3 text-5xl">🔍</div>
                  <h3 className="text-base font-semibold text-gray-900">No prompts yet</h3>
                  <p className="mt-1 max-w-xs text-sm text-gray-500">Try adjusting your search or filters, or share a prompt you love.</p>
                  <Link
                    href="/prompts/create"
                    className="mt-4 inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                  >
                    Create a prompt
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
