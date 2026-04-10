'use client'

import Link from 'next/link'
import { Team } from '@/types/team'
import { formatTeamDate, formatMemberCount, formatCollectionCount, getTeamStats } from '@/lib/teamUtils'

interface TeamInfoSidebarProps {
  team: Team
  teamId: string
  className?: string
}

export default function TeamInfoSidebar({
  team,
  teamId,
  className = ''
}: TeamInfoSidebarProps) {
  const stats = getTeamStats(team)

  return (
    <aside className={`bg-white border-l border-gray-200 team-info-sidebar ${className}`}>
      <div className="p-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Team Info</h2>
          <div className="flex items-center gap-2">
            {team.isPublic ? (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Public
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                Private
              </span>
            )}
            <Link
              href={`/teams/${teamId}/settings`}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-100 rounded">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Members</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.memberCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-green-100 rounded">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Collections</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.collectionCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-purple-100 rounded">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Admins</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{stats.adminCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-orange-100 rounded">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">Created</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">{formatTeamDate(team.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Team Members</h3>
            <Link
              href={`/teams/${teamId}/members`}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage
            </Link>
          </div>
          
          <div className="space-y-2">
            {team.members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {member.user.avatarUrl ? (
                    <img
                      src={member.user.avatarUrl}
                      alt={member.user.displayName || member.user.username}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-600">
                      {(member.user.displayName || member.user.username).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {member.user.displayName || member.user.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
            {team.members.length > 5 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                and {team.members.length - 5} more
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link
              href={`/teams/${teamId}/collections/create`}
              className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Collection
            </Link>
            <Link
              href={`/teams/${teamId}/members`}
              className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Manage Members
            </Link>
            <Link
              href={`/teams/${teamId}/settings`}
              className="flex items-center gap-2 p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Team Settings
            </Link>
          </div>
        </div>
      </div>
    </aside>
  )
}

