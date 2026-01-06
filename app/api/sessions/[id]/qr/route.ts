import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQRPayload } from '@/lib/qr'
import { storeQRPayload } from '@/lib/token-store'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Get current QR payload for session
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'professor') {
      return NextResponse.json(
        { error: 'Only professors can generate QR codes' },
        { status: 403 }
      )
    }

    const professor = await prisma.professor.findUnique({
      where: { userId: session.user.id },
    })

    if (!professor) {
      return NextResponse.json(
        { error: 'Professor profile not found' },
        { status: 404 }
      )
    }

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id },
    })

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (attendanceSession.professorId !== professor.id) {
      return NextResponse.json(
        { error: 'Not authorized to access this session' },
        { status: 403 }
      )
    }

    if (!attendanceSession.isActive) {
      return NextResponse.json(
        { error: 'Session is no longer active' },
        { status: 400 }
      )
    }

    // Generate fresh QR payload
    const payload = generateQRPayload(id, attendanceSession.sessionSecret)
    
    // Store payload and get short token for simpler QR code
    const token = storeQRPayload(payload)

    // Return short token - this creates a much simpler QR code
    // that's easier to scan from distance
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Generate QR error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}

