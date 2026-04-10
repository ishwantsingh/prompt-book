import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Teams API test endpoint working' })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ message: 'Teams API POST test endpoint working' })
}
