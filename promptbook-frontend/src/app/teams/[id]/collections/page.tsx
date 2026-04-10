'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function TeamCollectionsPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string

  useEffect(() => {
    // Redirect to the team page where collections are now displayed
    router.replace(`/teams/${teamId}`)
  }, [router, teamId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to team page...</p>
      </div>
    </div>
  )
}

