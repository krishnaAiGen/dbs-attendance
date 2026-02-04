import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'professor') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: params.id },
            include: {
                submissions: {
                    include: {
                        student: {
                            select: { fullName: true, email: true }
                        }
                    },
                    orderBy: { score: 'desc' }
                }
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Calculate Metrics
        const totalSubmissions = quiz.submissions.length;
        let meanScore = 0;
        let passedCount = 0;
        const items = quiz.submissions.map(sub => {
            meanScore += sub.score;
            if (sub.score >= 50) passedCount++; // Assuming 50% is pass
            return sub;
        });

        meanScore = totalSubmissions > 0 ? meanScore / totalSubmissions : 0;

        return NextResponse.json({
            quizTitle: quiz.title,
            totalSubmissions,
            meanScore,
            passedCount,
            submissions: items
        });

    } catch (error) {
        console.error('Quiz analytics error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
