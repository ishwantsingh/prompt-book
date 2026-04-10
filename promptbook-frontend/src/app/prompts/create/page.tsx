'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, withUserHeader } from '@/lib/utils'
import { ChevronLeftIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface FormData {
  title: string
  description: string
  prompt: string
  categoryId: string
  subcategoryId: string
  tags: string[]
}

interface Category {
  id: string
  name: string
  description: string
}

interface Subcategory {
  id: string
  name: string
  categoryId: string
  description: string
}

function CreatePromptPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
        <span className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-500" />
        Preparing editor...
      </div>
    </div>
  )
}

function CreatePromptPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get team collection context from URL params
  const teamId = searchParams.get('teamId')
  const collectionId = searchParams.get('collectionId')
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    prompt: '',
    categoryId: '',
    subcategoryId: '',
    tags: []
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([])
  const [requiredSubcategories, setRequiredSubcategories] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentTag, setCurrentTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load categories (with subcategories)
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const catsRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories`)
        if (catsRes.ok) {
          const catsJson = await catsRes.json()
          setCategories(catsJson.data || [])
          // Flatten subcategories from categories response
          const subs = (catsJson?.data || []).flatMap((c: any) => (c.subcategories || []).map((s: any) => ({ ...s, categoryId: c.id })))
          setSubcategories(subs)
        }
      } catch (e) {
        console.log('Failed to load categories')
      }
    }
    loadMeta()
  }, [])

  // Filter subcategories based on selected category
  useEffect(() => {
    if (formData.categoryId) {
      const scoped = subcategories.filter(sc => sc.categoryId === formData.categoryId)
      setFilteredSubcategories(scoped)
      setRequiredSubcategories(scoped.length > 0)
      if (!scoped.find(sc => sc.id === formData.subcategoryId)) {
        setFormData(prev => ({ ...prev, subcategoryId: scoped[0]?.id || '' }))
      }
    } else {
      setFilteredSubcategories([])
      setRequiredSubcategories(false)
      setFormData(prev => ({ ...prev, subcategoryId: '' }))
    }
  }, [formData.categoryId, subcategories])

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters'
    }

    if (!formData.prompt.trim()) {
      newErrors.prompt = 'Prompt content is required'
    } else if (formData.prompt.length < 50) {
      newErrors.prompt = 'Prompt must be at least 50 characters'
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required'
    }

    if (requiredSubcategories && !formData.subcategoryId) {
      newErrors.subcategoryId = 'Subcategory is required for this category'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/prompts`, withUserHeader({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          isPublic: true // All prompts are always public
        }),
      }, session?.user?.id))

      const result = await response.json()

      if (result.success) {
        alert('Prompt created successfully!')
        
        // If we have team collection context, add the prompt to the collection
        if (teamId && collectionId && result.data?.id) {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
            const addResponse = await apiFetch(
              `${baseUrl}/api/teams/${teamId}/collections/${collectionId}/prompts`,
              withUserHeader({
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  promptId: result.data.id
                }),
              }, session?.user?.id)
            )
            
            if (addResponse.ok) {
              // Navigate back to team collection
              router.push(`/teams/${teamId}?collection=${collectionId}`)
            } else {
              // Still navigate back even if adding to collection fails
              router.push(`/teams/${teamId}?collection=${collectionId}`)
            }
          } catch (error) {
            console.error('Failed to add prompt to collection:', error)
            // Still navigate back even if adding to collection fails
            router.push(`/teams/${teamId}?collection=${collectionId}`)
          }
        } else {
          // Normal flow - go to prompts page
          router.push('/prompts')
        }
      } else {
        setErrors({ submit: result.error || 'Failed to create prompt' })
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubcategoryChange = (subcategoryId: string) => {
    setFormData(prev => ({ ...prev, subcategoryId }))
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault()
      if (!formData.tags.includes(currentTag.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, currentTag.trim()]
        }))
      }
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  if (status === 'loading') {
    return <CreatePromptPageFallback />
  }

  if (!session) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-3 pb-24 pt-4 md:px-6 md:pt-8">
        {/* Mobile header actions */}
        <div className="mb-4 md:hidden" />

        {/* Page heading */}
        <header className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:rounded-3xl md:p-6">
          <div className="hidden items-center gap-2 text-sm text-gray-600 md:flex">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>→</span>
            {teamId ? (
              <>
                <Link href="/teams" className="hover:text-blue-600">Teams</Link>
                <span>→</span>
                <Link href={`/teams/${teamId}`} className="hover:text-blue-600">Team</Link>
                <span>→</span>
                <span>Create Prompt</span>
              </>
            ) : (
              <>
                <Link href="/prompts" className="hover:text-blue-600">Prompts</Link>
                <span>→</span>
                <span>Create</span>
              </>
            )}
          </div>

          <div className="space-y-2 md:max-w-3xl">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Create New Prompt</h1>
            <p className="text-sm text-gray-600 md:text-base">
              {teamId && collectionId
                ? 'Craft a prompt for your team collection with clear context and usage notes.'
                : 'Share your AI prompt with the community and help others achieve better results.'}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)]">
          {/* Form card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:gap-6">
              <section className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Give your prompt a concise, descriptive name"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description *</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Explain what the prompt does and when to use it"
                    rows={3}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formData.description.length} characters</span>
                    {errors.description && <span className="text-red-500">{errors.description}</span>}
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-xl bg-gray-50/80 p-3.5 md:p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categorization</h2>
                <div className="space-y-1.5">
                  <label htmlFor="category" className="text-xs font-medium text-gray-700">Category *</label>
                  <select
                    id="category"
                    value={formData.categoryId}
                    onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.categoryId ? 'border-red-400' : 'border-gray-200'
                    }`}
                  >
                    <option value="">Select a category…</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId}</p>}
                </div>

                {formData.categoryId && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Subcategory {requiredSubcategories && <span className="text-rose-600">*</span>}
                    </label>
                    <select
                      value={formData.subcategoryId || ''}
                      onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.subcategoryId ? 'border-red-400' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select a subcategory…</option>
                      {filteredSubcategories.map(sc => (
                        <option key={sc.id} value={sc.id}>{sc.name}</option>
                      ))}
                    </select>
                    {errors.subcategoryId && <p className="text-xs text-red-500">{errors.subcategoryId}</p>}
                  </div>
                )}
              </section>

              <section className="space-y-1.5">
                <label htmlFor="prompt" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Prompt Content *</label>
                <textarea
                  id="prompt"
                  value={formData.prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Write the prompt exactly as you would use it. Use [VARIABLE] to mark slots."
                  rows={10}
                  className={`w-full rounded-xl border px-3.5 py-3 text-sm font-mono shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.prompt ? 'border-red-400' : 'border-gray-200'
                  }`}
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Characters: {formData.prompt.length}</span>
                  {errors.prompt && <span className="text-red-500">{errors.prompt}</span>}
                </div>
              </section>

              <section className="space-y-1.5">
                <label htmlFor="tags" className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</label>
                <input
                  type="text"
                  id="tags"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Press Enter to add a tag"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {errors.submit && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {errors.submit}
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-gray-500 md:text-sm">
                  Prompts are public once published. Be sure to remove any sensitive information.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Creating…' : 'Create Prompt'}
                  </button>
                  <Link
                    href={teamId ? `/teams/${teamId}${collectionId ? `?collection=${collectionId}` : ''}` : '/prompts'}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:border-gray-300"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreatePromptPage() {
  return (
    <Suspense fallback={<CreatePromptPageFallback />}>
      <CreatePromptPageContent />
    </Suspense>
  )
}
