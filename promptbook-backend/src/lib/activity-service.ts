import { db } from './db'
import { 
  ActivityType, 
  ActivityTypeEnum, 
  CreateActivityParams, 
  CommentActivityData, 
  VoteActivityData, 
  FavoriteActivityData,
  ActivityWithActor
} from '@/types/activity'

export class ActivityService {
  /**
   * Create a comment activity when someone comments on a user's prompt
   */
  static async createCommentActivity(params: {
    userId: string        // Prompt owner
    actorId: string      // Commenter
    promptId: string
    commentId: string
    promptTitle: string
    commentContent: string
  }) {
    const { userId, actorId, promptId, commentId, promptTitle, commentContent } = params
    
    // Don't create activity if user comments on their own prompt
    if (userId === actorId) return null

    const actor = await db.user.findUnique({
      where: { id: actorId },
      select: { displayName: true, username: true }
    })

    if (!actor) return null

    const actorName = actor.displayName || actor.username
    const commentPreview = commentContent.length > 100 
      ? commentContent.substring(0, 100) + '...' 
      : commentContent

    const activityData: CommentActivityData = {
      promptId,
      promptTitle,
      commentId,
      commentPreview
    }

    return this.createActivity({
      userId,
      actorId,
      type: ActivityType.COMMENT_RECEIVED,
      title: 'New comment on your prompt',
      description: `${actorName} commented on "${promptTitle}"`,
      data: activityData
    })
  }

  /**
   * Create a reply activity when someone replies to a user's comment
   */
  static async createReplyActivity(params: {
    userId: string        // Original comment author
    actorId: string      // Replier
    promptId: string
    parentCommentId: string
    replyId: string
    promptTitle: string
    replyContent: string
  }) {
    const { userId, actorId, promptId, parentCommentId, replyId, promptTitle, replyContent } = params
    
    // Don't create activity if user replies to their own comment
    if (userId === actorId) return null

    const actor = await db.user.findUnique({
      where: { id: actorId },
      select: { displayName: true, username: true }
    })

    if (!actor) return null

    const actorName = actor.displayName || actor.username
    const replyPreview = replyContent.length > 100 
      ? replyContent.substring(0, 100) + '...' 
      : replyContent

    const activityData: CommentActivityData = {
      promptId,
      promptTitle,
      commentId: replyId,
      commentPreview: replyPreview
    }

    return this.createActivity({
      userId,
      actorId,
      type: ActivityType.REPLY_RECEIVED,
      title: 'Reply to your comment',
      description: `${actorName} replied to your comment on "${promptTitle}"`,
      data: activityData
    })
  }

  /**
   * Create a vote activity when someone votes on a user's prompt
   */
  static async createVoteActivity(params: {
    userId: string        // Prompt owner
    actorId: string      // Voter
    promptId: string
    promptTitle: string
    voteType: 'upvote' | 'downvote'
    newVoteCount: number
  }) {
    const { userId, actorId, promptId, promptTitle, voteType, newVoteCount } = params
    
    // Don't create activity if user votes on their own prompt
    if (userId === actorId) return null

    const actor = await db.user.findUnique({
      where: { id: actorId },
      select: { displayName: true, username: true }
    })

    if (!actor) return null

    const actorName = actor.displayName || actor.username
    const voteText = voteType === 'upvote' ? 'upvoted' : 'downvoted'

    const activityData: VoteActivityData = {
      promptId,
      promptTitle,
      voteType,
      voteCount: newVoteCount
    }

    return this.createActivity({
      userId,
      actorId,
      type: ActivityType.VOTE_RECEIVED,
      title: `Your prompt received a ${voteType}`,
      description: `${actorName} ${voteText} "${promptTitle}"`,
      data: activityData
    })
  }

  /**
   * Create a favorite activity when someone favorites a user's prompt
   */
  static async createFavoriteActivity(params: {
    userId: string        // Prompt owner
    actorId: string      // User who favorited
    promptId: string
    promptTitle: string
  }) {
    const { userId, actorId, promptId, promptTitle } = params
    
    // Don't create activity if user favorites their own prompt
    if (userId === actorId) return null

    const actor = await db.user.findUnique({
      where: { id: actorId },
      select: { displayName: true, username: true }
    })

    if (!actor) return null

    const actorName = actor.displayName || actor.username

    const activityData: FavoriteActivityData = {
      promptId,
      promptTitle
    }

    return this.createActivity({
      userId,
      actorId,
      type: ActivityType.FAVORITE_RECEIVED,
      title: 'Your prompt was saved',
      description: `${actorName} saved "${promptTitle}" to their favorites`,
      data: activityData
    })
  }

  /**
   * Core activity creation function
   */
  static async createActivity(params: CreateActivityParams) {
    try {
      const activity = await db.activity.create({
        data: {
          userId: params.userId,
          actorId: params.actorId,
          type: params.type,
          title: params.title,
          description: params.description,
          data: params.data as any,
          isRead: false
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        }
      })

      return activity
    } catch (error) {
      console.error('Error creating activity:', error)
      return null
    }
  }

  /**
   * Get user activities with pagination and filtering
   */
  static async getUserActivities(params: {
    userId: string
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: ActivityTypeEnum
  }) {
    const { userId, limit = 20, offset = 0, unreadOnly = false, type } = params

    const whereClause: any = { userId }
    
    if (unreadOnly) {
      whereClause.isRead = false
    }
    
    if (type) {
      whereClause.type = type
    }

    const [activities, unreadCount, total] = await Promise.all([
      // Get activities with pagination
      db.activity.findMany({
        where: whereClause,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      
      // Get unread count
      db.activity.count({
        where: { userId, isRead: false }
      }),
      
      // Get total count
      db.activity.count({
        where: { userId }
      })
    ])

    return {
      activities,
      hasMore: activities.length === limit,
      unreadCount,
      total
    }
  }

  /**
   * Mark a specific activity as read
   */
  static async markActivityAsRead(activityId: string, userId: string) {
    try {
      const activity = await db.activity.updateMany({
        where: { 
          id: activityId,
          userId // Ensure user can only mark their own activities
        },
        data: { isRead: true }
      })

      return activity.count > 0
    } catch (error) {
      console.error('Error marking activity as read:', error)
      return false
    }
  }

  /**
   * Mark a specific activity as unread
   */
  static async markActivityAsUnread(activityId: string, userId: string) {
    try {
      const activity = await db.activity.updateMany({
        where: { 
          id: activityId,
          userId // Ensure user can only mark their own activities
        },
        data: { isRead: false }
      })

      return activity.count > 0
    } catch (error) {
      console.error('Error marking activity as unread:', error)
      return false
    }
  }

  /**
   * Mark all user activities as read
   */
  static async markAllActivitiesAsRead(userId: string) {
    try {
      const result = await db.activity.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      })

      return result.count
    } catch (error) {
      console.error('Error marking all activities as read:', error)
      return 0
    }
  }

  /**
   * Get activity statistics for a user
   */
  static async getActivityStats(userId: string) {
    try {
      const [unreadCount, totalCount, recentCount] = await Promise.all([
        db.activity.count({
          where: { userId, isRead: false }
        }),
        db.activity.count({
          where: { userId }
        }),
        db.activity.count({
          where: { 
            userId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ])

      return {
        unreadCount,
        totalCount,
        recentCount
      }
    } catch (error) {
      console.error('Error getting activity stats:', error)
      return {
        unreadCount: 0,
        totalCount: 0,
        recentCount: 0
      }
    }
  }

  /**
   * Delete old activities (cleanup function)
   */
  static async cleanupOldActivities(daysOld: number = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
      
      const result = await db.activity.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      })

      return result.count
    } catch (error) {
      console.error('Error cleaning up old activities:', error)
      return 0
    }
  }
}
