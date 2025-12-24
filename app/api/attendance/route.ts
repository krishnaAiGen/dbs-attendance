import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { markAttendanceSchema } from '@/lib/validations'
import { verifyQRPayload, isPayloadTimestampValid } from '@/lib/qr'
import { calculateDistance, MAX_DISTANCE_METERS, isWithinProximity } from '@/lib/distance'

// POST: Mark attendance
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can mark attendance' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = markAttendanceSchema.safeParse(body)

    if (!validationResult.success) {
      const issues = validationResult.error.issues
      return NextResponse.json(
        { error: issues[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { sessionId, timestamp, nonce, signature, studentLatitude, studentLongitude } =
      validationResult.data

    // Fetch session
    const attendanceSession = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    })

    if (!attendanceSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Verify QR signature
    const isValidSignature = verifyQRPayload(
      { sessionId, timestamp, nonce, signature },
      attendanceSession.sessionSecret
    )

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid QR code' },
        { status: 400 }
      )
    }

    // Check session is active
    if (!attendanceSession.isActive) {
      return NextResponse.json(
        { error: 'This session has ended' },
        { status: 400 }
      )
    }

    // Check timestamp is within 60 seconds
    if (!isPayloadTimestampValid(timestamp)) {
      return NextResponse.json(
        { error: 'QR code has expired. Please scan a fresh code.' },
        { status: 400 }
      )
    }

    // Check if already marked attendance
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: session.user.id,
        },
      },
    })

    if (existingRecord) {
      return NextResponse.json(
        { error: 'You have already marked attendance for this session' },
        { status: 400 }
      )
    }

    // Calculate distance
    const distance = calculateDistance(
      attendanceSession.latitude,
      attendanceSession.longitude,
      studentLatitude,
      studentLongitude
    )

    // Check proximity
    if (!isWithinProximity(distance)) {
      return NextResponse.json(
        {
          error: 'Too far from classroom',
          distance: Math.round(distance),
          maxDistance: MAX_DISTANCE_METERS,
        },
        { status: 400 }
      )
    }

    // Create attendance record
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId: session.user.id,
        studentLatitude,
        studentLongitude,
        distanceMeters: distance,
      },
      include: {
        session: {
          select: { subjectName: true },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Attendance marked successfully',
        subjectName: record.session.subjectName,
        distance: Math.round(distance),
        markedAt: record.markedAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Mark attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    )
  }
}

// GET: Get student's attendance history
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'student') {
      return NextResponse.json(
        { error: 'Only students can access attendance history' },
        { status: 403 }
      )
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: session.user.id },
      orderBy: { markedAt: 'desc' },
      include: {
        session: {
          select: {
            id: true,
            subjectName: true,
            createdAt: true,
            professor: {
              include: {
                user: {
                  select: { fullName: true },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      records.map((r) => ({
        id: r.id,
        sessionId: r.session.id,
        subjectName: r.session.subjectName,
        professorName: r.session.professor.user.fullName,
        sessionDate: r.session.createdAt,
        markedAt: r.markedAt,
        distanceMeters: Math.round(r.distanceMeters),
      }))
    )
  } catch (error) {
    console.error('Get attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    )
  }
}

