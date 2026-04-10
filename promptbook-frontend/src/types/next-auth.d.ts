import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    backendAccessToken?: string | null
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      username: string
      displayName: string
      reputationScore: number
      avatarUrl?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    username?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    username: string
    displayName: string
    provider: string
  }
}
