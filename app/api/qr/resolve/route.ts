import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getQRPayload } from '@/lib/token-store'

// POST: Resolve short token to full QR payload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can resolve QR tokens' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    console.log('[QR Resolve] Resolving token:', token)
    
    // Look up the full payload from the short token
    const payload = getQRPayload(token)

    if (!payload) {
      console.log('[QR Resolve] Token not found or expired:', token)
      return NextResponse.json(
        { error: 'Invalid or expired QR code. Please scan a fresh code.' },
        { status: 400 }
      )
    }
    
    console.log('[QR Resolve] Token resolved successfully')

    // Return the full payload for attendance marking
    return NextResponse.json({
      sessionId: payload.sessionId,
      timestamp: payload.timestamp,
      nonce: payload.nonce,
      signature: payload.signature,
    })
  } catch (error) {
    console.error('Token resolution error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve QR code' },
      { status: 500 }
    )
  }
}

