import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'professor') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Since we know session.user.id exists, but we need the Professor ID from the relation
        const professor = await prisma.professor.findUnique({
            where: { userId: session.user.id },
        });

        if (!professor) {
            return NextResponse.json({ error: 'Professor profile not found' }, { status: 404 });
        }

        const body = await req.json();
        const { title, subject, deadline, questions } = body;

        const quiz = await prisma.quiz.create({
            data: {
                title,
                subject,
                deadline: deadline ? new Date(deadline) : null,
                professorId: professor.id,
                questions: {
                    create: questions.map((q: any) => ({
                        text: q.text,
                        type: q.type,
                        difficulty: q.difficulty,
                        options: {
                            create: q.options.map((o: any) => ({
                                text: o.text,
                                isCorrect: o.isCorrect,
                            })),
                        },
                    })),
                },
            },
        });

        return NextResponse.json({ quiz });
    } catch (error) {
        console.error('Quiz publishing error:', error);
        return NextResponse.json({ error: 'Failed to publish quiz' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List upcoming quizzes
        // In a real app, strict filtering might be needed.
        // Assuming all students can see all quizzes or filtering by subject matching
        const quizzes = await prisma.quiz.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                professor: {
                    select: { subjectName: true }
                },
                _count: {
                    select: { questions: true }
                },
                submissions: {
                    where: { studentId: session.user.id },
                    select: { id: true, score: true }
                }
            }
        });

        return NextResponse.json({ quizzes });
    } catch (error) {
        console.error('Fetch quizzes error:', error);
        return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
    }
}
