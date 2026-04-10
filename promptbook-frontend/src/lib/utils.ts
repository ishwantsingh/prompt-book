import { type ClassValue, clsx } from 'clsx'
import { getSession } from 'next-auth/react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return targetDate.toLocaleDateString()
  }
}

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  return base || ''
}

let cachedBackendAccessToken: string | null | undefined
let cachedBackendAccessTokenAt = 0
let pendingBackendAccessToken: Promise<string | null> | null = null

async function getBackendAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null
  }

  const now = Date.now()
  if (
    cachedBackendAccessToken !== undefined &&
    now - cachedBackendAccessTokenAt < 30_000
  ) {
    return cachedBackendAccessToken
  }

  if (pendingBackendAccessToken) {
    return pendingBackendAccessToken
  }

  pendingBackendAccessToken = (async () => {
    const session = await getSession()
    cachedBackendAccessToken = session?.backendAccessToken || null
    cachedBackendAccessTokenAt = Date.now()
    return cachedBackendAccessToken
  })()

  try {
    return await pendingBackendAccessToken
  } finally {
    pendingBackendAccessToken = null
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl()
  const url = input.startsWith('http') ? input : `${baseUrl}${input}`
  const headers = new Headers(init.headers || {})

  if (!headers.has('Authorization')) {
    const backendAccessToken = await getBackendAccessToken()
    if (backendAccessToken) {
      headers.set('Authorization', `Bearer ${backendAccessToken}`)
    }
  }

  return fetch(url, { ...init, headers })
}

export function withUserHeader(init: RequestInit = {}, _userId?: string | null): RequestInit {
  return { ...init, headers: new Headers(init.headers || {}) }
}

export function getScoreBand(score: number): 'excellent' | 'strong' | 'average' | 'weak' | 'poor' {
  if (score >= 90) return 'excellent'
  if (score >= 75) return 'strong'
  if (score >= 60) return 'average'
  if (score >= 40) return 'weak'
  return 'poor'
}

export function getScoreBandColor(score: number): string {
  const band = getScoreBand(score)
  switch (band) {
    case 'excellent': return 'text-green-600 bg-green-50'
    case 'strong': return 'text-blue-600 bg-blue-50'
    case 'average': return 'text-yellow-600 bg-yellow-50'
    case 'weak': return 'text-orange-600 bg-orange-50'
    case 'poor': return 'text-red-600 bg-red-50'
    default: return 'text-gray-600 bg-gray-50'
  }
}

export function formatScore(score: number): string {
  return `${Math.round(score)}/100`
}
