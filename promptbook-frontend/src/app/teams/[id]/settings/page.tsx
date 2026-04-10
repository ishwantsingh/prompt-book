'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiFetch, withUserHeader } from '@/lib/utils'
import { Team, TeamFormData } from '@/types/team'
import { validateTeamName, validateTeamDescription } from '@/lib/teamUtils'

export default function TeamSettingsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<TeamFormData>({
    name: '',
    description: '',
    isPublic: false
  })

  // Load team data
  useEffect(() => {
    const loadTeam = async () => {
      if (!session?.user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
        const response = await apiFetch(`${baseUrl}/api/teams/${teamId}`, withUserHeader({}, session.user.id))
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setTeam(data.data)
            setFormData({
              name: data.data.name,
              description: data.data.description || '',
              isPublic: data.data.isPublic
            })
          }
        }
      } catch (error) {
        console.error('Failed to load team:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTeam()
  }, [session, teamId])

  const handleInputChange = (field: keyof TeamFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate name
    const nameValidation = validateTeamName(formData.name)
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error || 'Invalid name'
    }

    // Validate description
    const descValidation = validateTeamDescription(formData.description)
    if (!descValidation.isValid) {
      newErrors.description = descValidation.error || 'Invalid description'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user || !team) {
      setErrors({ general: 'You must be signed in to update team settings' })
      return
    }

    if (!validateForm()) {
      return
    }

    try {
      setSaving(true)
      setErrors({})

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await apiFetch(`${baseUrl}/api/teams/${teamId}`, withUserHeader({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }, session.user.id))

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setTeam(data.data)
          // Show success message or redirect
          router.push(`/teams/${teamId}`)
        } else {
          setErrors({ general: data.error || 'Failed to update team' })
        }
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.error || 'Failed to update team' })
      }
    } catch (error) {
      console.error('Error updating team:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!session?.user || !team) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${team.name}"? This action cannot be undone and will remove all team data including collections and members.`
    )

    if (!confirmed) return

    try {
      setSaving(true)
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
      const response = await apiFetch(`${baseUrl}/api/teams/${teamId}`, withUserHeader({
        method: 'DELETE'
      }, session.user.id))

      if (response.ok) {
        router.push('/teams')
      } else {
        const errorData = await response.json()
        setErrors({ general: errorData.error || 'Failed to delete team' })
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Sign in required</h1>
          <p className="text-gray-600 mb-6">Please sign in to view team settings.</p>
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
        <span className="ml-2 text-gray-600">Loading team settings...</span>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Team not found</h1>
          <p className="text-gray-600 mb-6">The team you&apos;re looking for doesn&apos;t exist.</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/teams/${teamId}`}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Settings</h1>
              <p className="text-gray-600 mt-2">Manage your team&apos;s information and preferences</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
              <p className="text-sm text-gray-600">Update your team&apos;s basic information</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800 text-sm">{errors.general}</p>
                </div>
              )}

              {/* Team Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter team name"
                  maxLength={100}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {formData.name.length}/100 characters
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe your team&apos;s purpose and goals"
                  maxLength={500}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  {formData.description.length}/500 characters
                </p>
              </div>

              {/* Public/Private */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Visibility
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={formData.isPublic}
                      onChange={() => handleInputChange('isPublic', true)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Public Team</div>
                      <div className="text-sm text-gray-600">
                        Anyone can discover and join this team. Great for open communities and public projects.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!formData.isPublic}
                      onChange={() => handleInputChange('isPublic', false)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Private Team</div>
                      <div className="text-sm text-gray-600">
                        Only invited members can join. Perfect for internal teams and private projects.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  href={`/teams/${teamId}`}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow-sm border border-red-200">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-700">Irreversible and destructive actions</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Delete Team</h3>
                  <p className="text-sm text-gray-600">
                    Permanently delete this team and all of its data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={handleDeleteTeam}
                  disabled={saving}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {saving ? 'Deleting...' : 'Delete Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
