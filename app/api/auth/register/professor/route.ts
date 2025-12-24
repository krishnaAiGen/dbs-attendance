import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { professorRegistrationSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validationResult = professorRegistrationSchema.safeParse(body)
    if (!validationResult.success) {
      const issues = validationResult.error.issues
      return NextResponse.json(
        { error: issues[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { email, password, fullName, professorKey } = validationResult.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      )
    }

    // Validate professor key
    const key = await prisma.professorKey.findUnique({
      where: { keyCode: professorKey },
    })

    if (!key) {
      return NextResponse.json(
        { error: 'Invalid professor key' },
        { status: 400 }
      )
    }

    if (key.isUsed) {
      return NextResponse.json(
        { error: 'This professor key has already been used' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hash(password, 12)

    // Create user and professor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role: 'professor',
        },
      })

      // Create professor record
      await tx.professor.create({
        data: {
          userId: user.id,
          professorKeyId: key.id,
          subjectName: key.subjectName,
        },
      })

      // Mark key as used
      await tx.professorKey.update({
        where: { id: key.id },
        data: { isUsed: true },
      })

      return user
    })

    return NextResponse.json(
      {
        message: 'Registration successful',
        user: {
          id: result.id,
          email: result.email,
          fullName: result.fullName,
          role: result.role,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Professor registration error:', error)
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    )
  }
}

