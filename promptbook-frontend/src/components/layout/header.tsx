'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/notifications/NotificationBell'

export default function Header() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignIn = () => {
    router.push('/auth/signin')
  }

  const handleSignOut = () => {
    signOut()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl text-gray-900">PromptBook</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              href="/prompts"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              Browse Prompts
            </Link>
            <Link
              href="/prompts/create"
              className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
            >
              Create Prompt
            </Link>
            {session?.user && (
              <>
                <Link
                  href="/teams"
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  Teams
                </Link>
                <Link
                  href="/saved"
                  className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                >
                  Saved
                </Link>
              </>
            )}
          </nav>

          {/* User Section */}
          <div className="flex items-center space-x-4">
            {session?.user ? (
              <div className="flex items-center space-x-3">
                {/* Notification Bell */}
                <NotificationBell />

                {/* User Profile */}
                <Link href="/profile" className="flex items-center space-x-2 hover:bg-gray-50 rounded-md p-2 transition-colors">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {session.user.avatarUrl ? (
                      <Image 
                        src={session.user.avatarUrl}
                        alt={session.user.displayName || session.user.email || 'User'}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 font-medium text-sm">
                        {session.user.displayName?.charAt(0) || session.user.email?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-gray-700 font-medium hover:text-blue-600 transition-colors">
                    {session.user.displayName || session.user.email}
                  </span>
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
