'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function AdminPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>→</span>
            <span>Admin Dashboard</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage the AI Prompt Encyclopedia platform.</p>
            </div>
          </div>
        </div>

        {/* Disabled Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl">🚧</div>
            <div>
              <h2 className="text-2xl font-bold text-yellow-800 mb-2">Admin Dashboard Temporarily Disabled</h2>
              <p className="text-yellow-700 mb-4">
                The admin dashboard is currently under maintenance and is temporarily unavailable.
              </p>
              <p className="text-yellow-600 text-sm">
                All admin functionality has been preserved and will be restored in a future update.
              </p>
            </div>
            <div className="flex gap-4 mt-4">
              <Link
                href="/prompts"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Browse Prompts
              </Link>
              <Link
                href="/prompts/create"
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Create Prompt
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">What&apos;s Next?</h3>
          <p className="text-blue-700 text-sm">
            The admin dashboard will be re-enabled with enhanced features and improved security. 
            All existing admin data and configurations have been preserved.
          </p>
        </div>
      </div>
    </div>
  )
}
