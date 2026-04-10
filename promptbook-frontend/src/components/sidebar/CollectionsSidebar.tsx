'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { apiFetch, withUserHeader } from '@/lib/utils'
import '@/styles/sidebar.css'

interface TeamCollection {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  promptCount: number
}

interface CollectionsSidebarProps {
  teamId: string
  selectedCollection?: string
  onCollectionSelect: (collectionId: string) => void
  onClearSelection: () => void
  className?: string
}

export default function CollectionsSidebar({
  teamId,
  selectedCollection,
  onCollectionSelect,
  onClearSelection,
  className = ''
}: CollectionsSidebarProps) {
  const { data: session } = useSession()
  const [collections, setCollections] = useState<TeamCollection[]>([])
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load collections from API
  useEffect(() => {
    const loadCollections = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        const response = await apiFetch(
          `${baseUrl}/api/teams/${teamId}/collections`,
          withUserHeader({}, session.user.id)
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setCollections(data.data)
            
            // Auto-select the first collection if none is selected
            if (!selectedCollection && data.data.length > 0) {
              onCollectionSelect(data.data[0].id)
            }
          } else {
            setError('Failed to load collections')
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load collections')
        }
      } catch (error) {
        console.error('Failed to load collections:', error)
        setError('Failed to load collections')
      } finally {
        setLoading(false)
      }
    }

    loadCollections()
  }, [session, teamId, selectedCollection, onCollectionSelect])

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections(prev => {
      const newSet = new Set<string>()
      // Accordion behavior: Only one collection can be expanded at a time
      if (!prev.has(collectionId)) {
        newSet.add(collectionId)
      }
      return newSet
    })
  }

  const handleCollectionClick = (collectionId: string) => {
    toggleCollection(collectionId)
    onCollectionSelect(collectionId)
  }

  if (!session?.user) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Collections</h2>
            <p className="text-sm text-gray-500">Authentication required</p>
          </div>
        </div>
      </aside>
    )
  }

  if (loading) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  if (error) {
    return (
      <aside className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Collections</h2>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className={`bg-white border-r border-gray-200 collections-sidebar ${className}`}>
      <div className="p-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
          {selectedCollection && (
            <button
              onClick={onClearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Collections List */}
        <div className="space-y-1">
          {collections.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">📁</div>
              <p className="text-sm text-gray-500">No collections yet</p>
            </div>
          ) : (
            collections.map((collection) => {
              const isExpanded = expandedCollections.has(collection.id)
              const isSelected = selectedCollection === collection.id

              return (
                <div key={collection.id} className="space-y-1">
                  {/* Collection Button */}
                  <button
                    onClick={() => handleCollectionClick(collection.id)}
                    className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg collection-button ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 collection-active'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {/* Collection Icon */}
                    <span className="mr-3 text-lg mt-0.5">📁</span>
                    
                    {/* Collection Content */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{collection.name}</div>
                      {collection.description && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {collection.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {collection.promptCount} prompts
                        </span>
                        {collection.isPublic && (
                          <span className="text-xs text-green-600">Public</span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            {collections.length} collection{collections.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </aside>
  )
}

