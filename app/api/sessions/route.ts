import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createSessionSchema } from '@/lib/validations'
import { generateSessionSecret } from '@/lib/qr'

// POST: Create new attendance session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'professor') {
      return NextResponse.json(
        { error: 'Only professors can create sessions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createSessionSchema.safeParse(body)

    if (!validationResult.success) {
      const issues = validationResult.error.issues
      return NextResponse.json(
        { error: issues[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { latitude, longitude } = validationResult.data

    // Get professor record
    const professor = await prisma.professor.findUnique({
      where: { userId: session.user.id },
    })

    if (!professor) {
      return NextResponse.json(
        { error: 'Professor profile not found' },
        { status: 404 }
      )
    }

    // Check for active sessions
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        professorId: professor.id,
        isActive: true,
      },
    })

    if (activeSession) {
      return NextResponse.json(
        { error: 'You already have an active session' },
        { status: 400 }
      )
    }

    // Create new session
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    const sessionSecret = generateSessionSecret()

    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        professorId: professor.id,
        subjectName: professor.subjectName,
        latitude,
        longitude,
        sessionSecret,
        expiresAt,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        id: attendanceSession.id,
        subjectName: attendanceSession.subjectName,
        createdAt: attendanceSession.createdAt,
        expiresAt: attendanceSession.expiresAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create session error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

// GET: List sessions
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role === 'professor') {
      // Get professor's sessions
      const professor = await prisma.professor.findUnique({
        where: { userId: session.user.id },
      })

      if (!professor) {
        return NextResponse.json(
          { error: 'Professor profile not found' },
          { status: 404 }
        )
      }

      const sessions = await prisma.attendanceSession.findMany({
        where: { professorId: professor.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { records: true },
          },
        },
      })

      return NextResponse.json(
        sessions.map((s) => ({
          id: s.id,
          subjectName: s.subjectName,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isActive: s.isActive,
          attendanceCount: s._count.records,
        }))
      )
    } else {
      // Get sessions where student has attendance
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId: session.user.id },
        orderBy: { markedAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              subjectName: true,
              createdAt: true,
            },
          },
        },
      })

      return NextResponse.json(
        records.map((r) => ({
          id: r.session.id,
          subjectName: r.session.subjectName,
          markedAt: r.markedAt,
          distanceMeters: r.distanceMeters,
        }))
      )
    }
  } catch (error) {
    console.error('List sessions error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

