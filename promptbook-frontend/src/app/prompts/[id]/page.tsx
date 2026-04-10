'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
// Removed mock data usage; always fetch from API/DB
import { formatRelativeTime, apiFetch, withUserHeader } from '@/lib/utils'

interface Comment {
  id: string
  content: string
  author: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string
  }
  createdAt: string
  upvotes: number
  downvotes: number
  replies?: Comment[]
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
  subcategory?: {
    id: string
    name: string
    slug?: string
  } | null
  author: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string
  }
  upvotes: number
  downvotes: number
  bestScore: number
  createdAt: string
}

export default function PromptDetailsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const promptId = params.id as string

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [voteState, setVoteState] = useState<'upvote' | 'downvote' | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [commentVotes, setCommentVotes] = useState<Record<string, {upvotes: number, downvotes: number}>>({})
  const [commentVoteStates, setCommentVoteStates] = useState<Record<string, 'upvote' | 'downvote' | null>>({})
  const [voteCounts, setVoteCounts] = useState<{upvotes: number, downvotes: number} | null>(null)

  const loadCommentVotes = useCallback(async (commentsData: Comment[]) => {
    try {
      const allCommentIds: string[] = []
      commentsData.forEach(comment => {
        allCommentIds.push(comment.id)
        if (comment.replies) {
          comment.replies.forEach(reply => allCommentIds.push(reply.id))
        }
      })

      if (allCommentIds.length > 0) {
        const response = await apiFetch(`/api/comments/votes?commentIds=${allCommentIds.join(',')}`, withUserHeader({}, session?.user?.id))
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const newVoteCounts: Record<string, {upvotes: number, downvotes: number}> = {}

            Object.entries(data.data).forEach(([commentId, voteData]: [string, any]) => {
              newVoteCounts[commentId] = {
                upvotes: (voteData as any).upvotes,
                downvotes: (voteData as any).downvotes
              }
            })

            setCommentVotes(newVoteCounts)

            if (session?.user) {
              const userVoteEntries = await Promise.all(
                allCommentIds.map(async (id) => {
                  try {
                    const res = await apiFetch(`/api/comments/${id}/vote`, withUserHeader({}, session?.user?.id))
                    if (!res.ok) return [id, null]
                    const d = await res.json()
                    return [id, d?.data?.userVote ?? null]
                  } catch {
                    return [id, null]
                  }
                })
              )

              const newVoteStates: Record<string, 'upvote' | 'downvote' | null> = {}
              userVoteEntries.forEach(([id, uv]: any) => {
                newVoteStates[id as string] = (uv as 'upvote' | 'downvote' | null)
              })
              setCommentVoteStates(newVoteStates)
            }
          }
        }
      }
    } catch (error) {
      console.log('Failed to load comment vote data')
    }
  }, [session?.user])

  useEffect(() => {
    if (promptId) {
      const loadPrompt = async () => {
        try {
          // Use the new slug-based API route that handles both slugs and IDs
          const response = await apiFetch(`/api/prompts/${promptId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              setPrompt(data.data)
              
              // Now load related data using the actual prompt ID
              const actualPromptId = data.data.id
              
              // Load comments
              const loadComments = async () => {
                try {
                  const response = await apiFetch(`/api/prompts/${actualPromptId}/comments`, withUserHeader({}, session?.user?.id))
                  if (response.ok) {
                    const data = await response.json()
                    const loadedComments = data.data || []
                    setComments(loadedComments)
                    if (loadedComments.length > 0) {
                      await loadCommentVotes(loadedComments)
                    }
                  }
                } catch (error) {
                  console.log('Failed to load comments')
                }
              }

              // Load vote data
              const loadVoteData = async () => {
                try {
                  const response = await apiFetch(`/api/prompts/${actualPromptId}/vote`, withUserHeader({}, session?.user?.id))
                  if (response.ok) {
                    const data = await response.json()
                    if (data.success && data.data) {
                      if (session?.user) {
                        setVoteState(data.data.userVote)
                      }
                      setVoteCounts({
                        upvotes: data.data.upvotes,
                        downvotes: data.data.downvotes
                      })
                    }
                  }
                } catch (error) {
                  console.log('Failed to load vote data')
                }
              }

              // Load saved state
              const loadSavedStateForPrompt = async () => {
                if (session?.user) {
                  try {
                    const response = await apiFetch(`/api/prompts/${actualPromptId}/favorite`, withUserHeader({}, session?.user?.id))
                    if (response.ok) {
                      const data = await response.json()
                      if (data.success && data.data) {
                        setIsSaved(data.data.isFavorite)
                      }
                    }
                  } catch (error) {
                    console.log('Failed to load saved state')
                  }
                }
              }
              
              // Load all related data
              await Promise.all([
                loadComments(),
                loadVoteData(),
                loadSavedStateForPrompt()
              ])
            }
          }
        } catch (error) {
          console.log('Failed to load prompt from API')
        }
        setLoading(false)
      }
      
      loadPrompt()
    }
  }, [promptId, session, loadCommentVotes])

  useEffect(() => {
    if (session?.user && comments.length > 0) {
      loadCommentVotes(comments)
    }
  }, [session, comments, loadCommentVotes])

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!session?.user || !prompt) {
      alert('Please sign in to vote')
      return
    }

    const currentVote = voteState
    let newVote: 'upvote' | 'downvote' | null = voteType

    if (currentVote === voteType) {
      newVote = null
    }

    setVoteState(newVote)

    if (prompt) {
      const currentCounts = voteCounts || { upvotes: prompt.upvotes, downvotes: prompt.downvotes }
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

      setVoteCounts({ upvotes: newUpvotes, downvotes: newDownvotes })
    }

    try {
      const response = await apiFetch(`/api/prompts/${prompt.id}/vote`, withUserHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      }, session.user.id))
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setVoteState(result.data.voteType)
          setVoteCounts({
            upvotes: result.data.upvotes,
            downvotes: result.data.downvotes
          })
        }
      } else {
        setVoteState(currentVote)
        if (prompt) {
          setVoteCounts({ upvotes: prompt.upvotes, downvotes: prompt.downvotes })
        }
      }
    } catch (error) {
      setVoteState(currentVote)
      if (prompt) {
        setVoteCounts({ upvotes: prompt.upvotes, downvotes: prompt.downvotes })
      }
    }
  }

  const handleSave = async () => {
    if (!session?.user || !prompt) {
      alert('Please sign in to save prompts')
      return
    }

    setIsSaved(!isSaved)

    try {
      const response = await apiFetch(`/api/prompts/${prompt.id}/favorite`, withUserHeader({
        method: isSaved ? 'DELETE' : 'POST'
      }, session.user.id))
      
      if (!response.ok) {
        setIsSaved(isSaved)
      }
    } catch (error) {
      setIsSaved(isSaved)
    }
  }

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user || !prompt) {
      alert('Please sign in to comment')
      return
    }

    if (!newComment.trim()) return

    try {
      const response = await apiFetch(`/api/prompts/${prompt.id}/comments`, withUserHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      }, session.user.id))
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const newCommentObj = {
            ...result.data,
            replies: []
          }
          setComments(prev => [newCommentObj, ...prev])
          setNewComment('')
        } else {
          throw new Error('Invalid response')
        }
      } else {
        throw new Error('Failed to post comment')
      }
    } catch (error) {
      // no fallback
    }
  }

  const handleReplySubmit = async (parentId: string) => {
    if (!session?.user || !prompt) {
      alert('Please sign in to reply')
      return
    }

    if (!replyText.trim()) return

    try {
      const response = await apiFetch(`/api/prompts/${prompt.id}/comments`, withUserHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, parentId })
      }, session.user.id))
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const newReply = {
            ...result.data,
            upvotes: result.data.upvotes || 0,
            downvotes: result.data.downvotes || 0
          }
          
          setComments(prev => prev.map(comment => 
            comment.id === parentId 
              ? { ...comment, replies: [...(comment.replies || []), newReply] }
              : comment
          ))
          setReplyText('')
          setReplyingTo(null)
        } else {
          throw new Error('Invalid response')
        }
      } else {
        throw new Error('Failed to post reply')
      }
    } catch (error) {
      // no fallback
    }
  }

  const handleCommentVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
    if (!session?.user) {
      alert('Please sign in to vote')
      return
    }

    const currentVote = commentVoteStates[commentId] || null
    let newVote: 'upvote' | 'downvote' | null = voteType

    if (currentVote === voteType) {
      newVote = null
    }

    setCommentVoteStates(prev => ({
      ...prev,
      [commentId]: newVote
    }))

    const comment = comments.find(c => c.id === commentId) || 
                   comments.flatMap(c => c.replies || []).find(r => r.id === commentId)
    
    if (comment) {
      const currentCounts = commentVotes[commentId] || { upvotes: comment.upvotes, downvotes: comment.downvotes }
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

      setCommentVotes(prev => ({
        ...prev,
        [commentId]: { upvotes: newUpvotes, downvotes: newDownvotes }
      }))
    }

    try {
      const response = await apiFetch(`/api/comments/${commentId}/vote`, withUserHeader({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      }, session.user.id))

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setCommentVoteStates(prev => ({
            ...prev,
            [commentId]: result.data.voteType
          }))
          setCommentVotes(prev => ({
            ...prev,
            [commentId]: {
              upvotes: result.data.upvotes,
              downvotes: result.data.downvotes
            }
          }))
        }
      } else {
        setCommentVoteStates(prev => ({
          ...prev,
          [commentId]: currentVote
        }))
        if (comment) {
          setCommentVotes(prev => ({
            ...prev,
            [commentId]: { upvotes: comment.upvotes, downvotes: comment.downvotes }
          }))
        }
      }
    } catch (error) {
      setCommentVoteStates(prev => ({
        ...prev,
        [commentId]: currentVote
      }))
      if (comment) {
        setCommentVotes(prev => ({
          ...prev,
          [commentId]: { upvotes: comment.upvotes, downvotes: comment.downvotes }
        }))
      }
    }
  }

  const handleCopy = async () => {
    if (!prompt) return
    
    try {
      await navigator.clipboard.writeText(prompt.prompt)
      alert('Prompt copied to clipboard!')
    } catch (error) {
      alert('Failed to copy prompt')
    }
  }

  const handleShare = async () => {
    if (!prompt) return
    
    // Use slug-based URL for better SEO and sharing
    const shareUrl = `${window.location.origin}/prompts/${prompt.slug}`
    
    const shareData = {
      title: prompt.title,
      text: prompt.description,
      url: shareUrl
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prompt...</p>
        </div>
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Prompt Not Found</h1>
          <p className="text-gray-600 mb-4">The prompt you&apos;re looking for doesn&apos;t exist.</p>
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>→</span>
          <Link href="/prompts" className="hover:text-blue-600">Prompts</Link>
          <span>→</span>
          <span>{prompt.title}</span>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm border">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{prompt.title}</h1>
                <p className="text-gray-600 mb-4">{prompt.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md">
                    {prompt.category.name}
                  </span>
                  <span>by <Link href={`/users/${prompt.author.id}`} className="text-blue-600 hover:text-blue-800 font-medium">{prompt.author.displayName}</Link></span>
                  <span>{formatRelativeTime(prompt.createdAt)}</span>
                  <span className="font-medium text-purple-600">Score: {typeof prompt.bestScore === 'number' ? Math.round(prompt.bestScore) : 'Not yet scored'}</span>
                </div>
              </div>
              
              {/* Save Button */}
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  isSaved 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* Subcategory */}
            <div className="flex flex-wrap gap-2">
              {prompt.subcategory && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                  {prompt.subcategory.name}
                </span>
              )}
            </div>
          </div>

          {/* Prompt Content */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Prompt</h2>
            <div className="bg-gray-50 rounded-md p-4 mb-6">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                {prompt.prompt}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                {/* Voting */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote('upvote')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      voteState === 'upvote'
                        ? 'bg-green-100 text-green-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    {voteCounts?.upvotes ?? prompt.upvotes}
                  </button>
                  
                  <button
                    onClick={() => handleVote('downvote')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      voteState === 'downvote'
                        ? 'bg-red-100 text-red-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {voteCounts?.downvotes ?? prompt.downvotes}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  📋 Copy Prompt
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  🔗 Share
                </button>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Comments ({comments.length})
            </h2>

            {/* Comment Form */}
            {session?.user ? (
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this prompt..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {newComment.length}/1000 characters
                  </span>
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Post Comment
                  </button>
                </div>
              </form>
            ) : (
              <div className="mb-6 p-4 bg-gray-50 rounded-md">
                <p className="text-gray-600 text-center">
                  <Link href="/auth/signin" className="text-blue-600 hover:text-blue-800 font-medium">
                    Sign in
                  </Link>
                  {' '}to join the discussion
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {comment.author.displayName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <Link href={`/users/${comment.author.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                          {comment.author.displayName}
                        </Link>
                        <span className="text-gray-500 text-sm ml-2">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{comment.content}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <button 
                      onClick={() => handleCommentVote(comment.id, 'upvote')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        commentVoteStates[comment.id] === 'upvote' 
                          ? 'bg-green-100 text-green-700' 
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      {commentVotes[comment.id]?.upvotes ?? comment.upvotes}
                    </button>
                    <button 
                      onClick={() => handleCommentVote(comment.id, 'downvote')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        commentVoteStates[comment.id] === 'downvote' 
                          ? 'bg-red-100 text-red-700' 
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {commentVotes[comment.id]?.downvotes ?? comment.downvotes}
                    </button>
                    <button 
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      Reply
                    </button>
                  </div>

                  {/* Reply Form */}
                  {replyingTo === comment.id && session?.user && (
                    <div className="mt-4 ml-8">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          onKeyPress={(e) => e.key === 'Enter' && handleReplySubmit(comment.id)}
                        />
                        <button
                          onClick={() => handleReplySubmit(comment.id)}
                          disabled={!replyText.trim()}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null)
                            setReplyText('')
                          }}
                          className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-8 space-y-3">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 font-medium text-xs">
                                {reply.author.displayName.charAt(0)}
                              </span>
                            </div>
                            <Link href={`/users/${reply.author.id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600">
                              {reply.author.displayName}
                            </Link>
                            <span className="text-gray-500 text-xs">
                              {formatRelativeTime(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{reply.content}</p>
                          
                          <div className="flex items-center gap-3 text-xs">
                            <button 
                              onClick={() => handleCommentVote(reply.id, 'upvote')}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                commentVoteStates[reply.id] === 'upvote' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'hover:bg-gray-100 text-gray-600'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              {commentVotes[reply.id]?.upvotes ?? reply.upvotes}
                            </button>
                            <button 
                              onClick={() => handleCommentVote(reply.id, 'downvote')}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                commentVoteStates[reply.id] === 'downvote' 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'hover:bg-gray-100 text-gray-600'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {commentVotes[reply.id]?.downvotes ?? reply.downvotes}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {comments.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-2">💬</div>
                <p className="text-gray-500">No comments yet. Be the first to share your thoughts!</p>
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
