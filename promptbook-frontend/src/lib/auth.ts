import { NextAuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { issueBackendAccessToken } from "@/lib/backend-access-token"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt", // JWT sessions - no database required
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          username: profile.login,
          email: profile.email,
          image: profile.avatar_url,
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          username: profile.email.split('@')[0],
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    jwt: async ({ token, user, account }) => {
      if (user && account) {
        // Store user data in JWT token
        token.id = user.id
        token.username = (user as any).username || user.email?.split('@')[0]
        token.displayName = user.name || 'Anonymous User'
        token.provider = account.provider
        
        // Optional: Call backend API to create/sync user
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
          const backendAccessToken = issueBackendAccessToken({
            userId: user.id,
            email: user.email,
            username: (user as any).username || user.email?.split('@')[0],
            displayName: user.name,
          })

          if (apiBaseUrl && backendAccessToken) {
            await fetch(`${apiBaseUrl}/api/auth/sync-user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${backendAccessToken}`,
              },
              body: JSON.stringify({
                username: (user as any).username || user.email?.split('@')[0],
                displayName: user.name,
                avatarUrl: user.image,
                provider: account.provider,
              }),
            })
          }
        } catch (error) {
          console.error('Failed to sync user with backend:', error)
        }
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session?.user && token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.displayName = token.displayName as string
        session.user.reputationScore = 0 // Default, could fetch from API
        session.user.avatarUrl = session.user.image
        session.backendAccessToken = issueBackendAccessToken({
          userId: token.id as string,
          email: session.user.email || token.email,
          username: token.username as string,
          displayName: token.displayName as string,
        })
      }
      return session
    },
  },
}
