'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils';

interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'comment_received' | 'reply_received' | 'vote_received' | 'favorite_received' | 'prompt_created';
  title: string;
  description: string;
  data: any;
  createdAt: Date;
  isRead?: boolean;
}

export default function ActivityFeed() {
  const { data: session } = useSession();
  const router = useRouter();
  const activityRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);

  // Fetch activities
  const fetchActivities = useCallback(async (loadMore = false) => {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    try {
      const currentOffset = loadMore ? offset : 0;
      const response = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/activity?limit=10&offset=${currentOffset}`,
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.activities) {
          if (loadMore) {
            setActivities(prev => [...prev, ...data.activities]);
          } else {
            setActivities(data.activities);
          }
          setHasMore(data.hasMore);
          setOffset(currentOffset + data.activities.length);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, offset]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Handle deep linking to specific activities
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#activity-')) {
      const activityId = hash.replace('#activity-', '');
      setHighlightedActivityId(activityId);
      
      // Scroll to the activity after a short delay to ensure it's rendered
      setTimeout(() => {
        const element = activityRefs.current[activityId];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove highlight after 3 seconds
          setTimeout(() => setHighlightedActivityId(null), 3000);
        }
      }, 500);
    }
  }, [activities]);

  // Mark activity as read when clicked
  const markActivityAsRead = async (activityId: string) => {
    if (!session?.user?.id) return;
    
    try {
      const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user/activity/${activityId}/read`, {
        method: 'PUT',
      });
      if (response.ok) {
        setActivities(prev => 
          prev.map(activity => 
            activity.id === activityId ? { ...activity, isRead: true } : activity
          )
        );
      }
    } catch (error) {
      console.error('Error marking activity as read:', error);
    }
  };

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prompt_created':
        return (
          <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'comment_received':
      case 'reply_received':
        return (
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'vote_received':
        return (
          <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          </div>
        );
      case 'favorite_received':
        return (
          <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!session?.user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-600">Sign in to see activity on your prompts</p>
        <Link href="/auth/signin" className="mt-2 text-blue-600 hover:text-blue-800 font-medium">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
        <p className="text-sm text-gray-600 mt-1">See activity on your prompts and comments</p>
      </div>

      {/* Activities List */}
      <div className="divide-y divide-gray-200">
        {isLoading && activities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Loading activity feed...
          </div>
        ) : activities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-2">📱</div>
            <p className="font-medium">No activity yet</p>
            <p className="text-sm mt-1">Create some prompts to start receiving activity notifications</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id} 
              id={`activity-${activity.id}`}
              ref={(el) => { activityRefs.current[activity.id] = el; }}
              onClick={() => {
                if (!activity.isRead) {
                  markActivityAsRead(activity.id);
                }
              }}
              className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                highlightedActivityId === activity.id 
                  ? 'bg-blue-50 border-l-4 border-blue-500' 
                  : ''
              } ${
                !activity.isRead 
                  ? 'bg-blue-50/30 border-l-2 border-blue-300' 
                  : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Activity Icon */}
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{activity.userName}</span>
                    <span className="text-sm text-gray-500">{formatTimeAgo(activity.createdAt)}</span>
                    {!activity.isRead && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        New
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>

                  {/* Activity Data Link */}
                  {activity.data?.promptId && (
                    <Link 
                      href={`/prompts/${activity.data.promptId}`}
                      className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {activity.data.promptTitle || 'View prompt'} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && activities.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => fetchActivities(true)}
            disabled={isLoading}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Load more activity'}
          </button>
        </div>
      )}
    </div>
  );
}
