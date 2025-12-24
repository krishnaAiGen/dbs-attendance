import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Get active session for professor
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'professor') {
      return NextResponse.json(
        { error: 'Only professors can access this endpoint' },
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

    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        professorId: professor.id,
        isActive: true,
      },
      include: {
        _count: {
          select: { records: true },
        },
      },
    })

    if (!activeSession) {
      return NextResponse.json({ session: null })
    }

    return NextResponse.json({
      session: {
        id: activeSession.id,
        subjectName: activeSession.subjectName,
        createdAt: activeSession.createdAt,
        expiresAt: activeSession.expiresAt,
        attendanceCount: activeSession._count.records,
      },
    })
  } catch (error) {
    console.error('Get active session error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    )
  }
}

