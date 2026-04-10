import { NextResponse } from 'next/server'
import { testConnectionWithRetry } from '@/lib/db-retry'

export async function GET() {
  try {
    await testConnectionWithRetry()

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    console.error('Health check failed:', error)
    const isDevelopment = process.env.NODE_ENV !== 'production'

    return NextResponse.json(
      {
        ok: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        ...(isDevelopment
          ? {
              details:
                error instanceof Error ? error.message : 'Unknown error',
            }
          : {}),
      }, 
      { status: 500 }
    )
  }
}
