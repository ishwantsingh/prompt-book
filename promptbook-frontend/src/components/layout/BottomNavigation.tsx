'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  id: string
  label: string
  href: string
  icon: string
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/prompts',
    icon: '🏠'
  },
  {
    id: 'create',
    label: 'Create',
    href: '/prompts/create',
    icon: '✨'
  },
  {
    id: 'teams',
    label: 'Teams',
    href: '/teams',
    icon: '👥',
    requiresAuth: true
  },
  {
    id: 'saved',
    label: 'Saved',
    href: '/saved',
    icon: '❤️',
    requiresAuth: true
  }
]

export default function BottomNavigation() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)

  // Filter nav items based on authentication
  const visibleNavItems = navItems.filter(item =>
    !item.requiresAuth || session?.user
  )

  // Don't show navigation on certain pages
  const hiddenPaths = ['/auth', '/admin']
  const shouldHide = hiddenPaths.some(path => pathname?.startsWith(path))

  if (shouldHide || !isVisible) {
    return null
  }

  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div className="h-16 mobile-only" />

      {/* Bottom Navigation */}
      <nav className="mobile-only fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-around px-3 py-2">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/prompts' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex min-h-[52px] w-full max-w-[80px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
                aria-label={item.label}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="leading-none tracking-tight">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

