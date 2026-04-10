export const ActivityType = {
  COMMENT_RECEIVED: 'comment_received',
  REPLY_RECEIVED: 'reply_received',
  VOTE_RECEIVED: 'vote_received',
  FAVORITE_RECEIVED: 'favorite_received',
  PROMPT_CREATED: 'prompt_created'
} as const

export type ActivityTypeEnum = typeof ActivityType[keyof typeof ActivityType]

export interface BaseActivityData {
  promptId?: string
  promptTitle?: string
  commentId?: string
  commentPreview?: string
  voteType?: 'upvote' | 'downvote'
  voteCount?: number
  category?: string
}

export interface CommentActivityData extends BaseActivityData {
  promptId: string
  promptTitle: string
  commentId: string
  commentPreview: string
}

export interface VoteActivityData extends BaseActivityData {
  promptId: string
  promptTitle: string
  voteType: 'upvote' | 'downvote'
  voteCount: number
}

export interface FavoriteActivityData extends BaseActivityData {
  promptId: string
  promptTitle: string
}

export interface CreateActivityParams {
  userId: string
  actorId: string
  type: ActivityTypeEnum
  title: string
  description: string
  data: BaseActivityData
}

export interface ActivityWithActor {
  id: string
  userId: string
  actorId: string
  type: ActivityTypeEnum
  title: string
  description: string
  data: BaseActivityData
  isRead: boolean
  createdAt: Date
  actor: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
}

export interface ActivityFeedResponse {
  activities: ActivityWithActor[]
  hasMore: boolean
  unreadCount: number
  total: number
}
