'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatRelativeTime, apiFetch, withUserHeader } from '@/lib/utils'

interface SavedPrompt {
  id: string
  slug: string
  title: string
  description: string
  category: {
    id: string
    name: string
  }
  author: {
    id: string
    username: string
    displayName: string
  }
  bestScore: number
  createdAt: string
  savedAt: string
}

export default function SavedPromptsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Don't redirect while session is loading
    if (status === 'loading') {
      return
    }
    
    if (status === 'unauthenticated' || !session?.user) {
      router.push('/auth/signin')
      return
    }

    // Fetch saved prompts from API
    const fetchSavedPrompts = async () => {
      try {
        setLoading(true)
        const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/favorites`, withUserHeader({}, session.user.id))
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setSavedPrompts(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch saved prompts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSavedPrompts()
  }, [session, status, router])

  const handleRemoveSaved = async (promptId: string) => {
    setSavedPrompts(prev => prev.filter(prompt => prompt.id !== promptId))
    
    try {
      await apiFetch(`/api/prompts/${promptId}/favorite`, withUserHeader({
        method: 'DELETE'
      }, session?.user?.id))
    } catch (error) {
      console.log('Remove failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved prompts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>→</span>
            <span>Saved Prompts</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Saved Prompts</h1>
          <p className="text-gray-600">Your collection of favorited prompts for quick access.</p>
        </div>

        {/* Stats */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Collection Summary</h2>
              <p className="text-gray-600">You have {savedPrompts.length} saved prompts</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{savedPrompts.length}</div>
              <div className="text-sm text-gray-500">Total Saved</div>
            </div>
          </div>
        </div>

        {/* Saved Prompts List */}
        {savedPrompts.length > 0 ? (
          <div className="space-y-4">
            {savedPrompts.map((prompt) => (
              <div key={prompt.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link
                        href={`/prompts/${prompt.slug}`}
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors mb-2 block"
                      >
                        {prompt.title}
                      </Link>
                      <p className="text-gray-600 mb-3">{prompt.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                          {prompt.category.name}
                        </span>
                        <span>by {prompt.author.displayName}</span>
                        <span>Score: {prompt.bestScore}</span>
                        <span>Saved {formatRelativeTime(prompt.savedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/prompts/${prompt.slug}`}
                        className="px-3 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleRemoveSaved(prompt.id)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">💾</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved prompts yet</h3>
            <p className="text-gray-600 mb-4">Start saving prompts you find useful for quick access later.</p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                href="/prompts"
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                Browse More Prompts
              </Link>
              <Link
                href="/prompts/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Create New Prompt
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
