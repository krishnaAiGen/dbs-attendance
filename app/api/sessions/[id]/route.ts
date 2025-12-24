import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Session details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        professor: {
          include: {
            user: {
              select: { fullName: true },
            },
          },
        },
        records: {
          include: {
            student: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { markedAt: 'asc' },
        },
        _count: {
          select: { records: true },
        },
      },
    })

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check authorization
    if (session.user.role === 'professor') {
      const professor = await prisma.professor.findUnique({
        where: { userId: session.user.id },
      })

      if (attendanceSession.professorId !== professor?.id) {
        return NextResponse.json(
          { error: 'Not authorized to view this session' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      id: attendanceSession.id,
      subjectName: attendanceSession.subjectName,
      professorName: attendanceSession.professor.user.fullName,
      createdAt: attendanceSession.createdAt,
      expiresAt: attendanceSession.expiresAt,
      isActive: attendanceSession.isActive,
      attendanceCount: attendanceSession._count.records,
      students: attendanceSession.records.map((r) => ({
        id: r.student.id,
        name: r.student.fullName,
        email: r.student.email,
        markedAt: r.markedAt,
        distanceMeters: Math.round(r.distanceMeters),
      })),
    })
  } catch (error) {
    console.error('Get session error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

// PATCH: End session
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'professor') {
      return NextResponse.json(
        { error: 'Only professors can end sessions' },
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
        { error: 'Not authorized to end this session' },
        { status: 403 }
      )
    }

    const updatedSession = await prisma.attendanceSession.update({
      where: { id },
      data: { isActive: false },
      include: {
        _count: {
          select: { records: true },
        },
      },
    })

    return NextResponse.json({
      id: updatedSession.id,
      subjectName: updatedSession.subjectName,
      isActive: updatedSession.isActive,
      attendanceCount: updatedSession._count.records,
    })
  } catch (error) {
    console.error('End session error:', error)
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    )
  }
}

