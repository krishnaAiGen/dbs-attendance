import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'student') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const quizId = params.id;
        const body = await req.json();
        const { answers } = body; // Array of { questionId, selectedOptionId }

        // Fetch quiz with questions and correct options
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    include: {
                        options: true
                    }
                }
            }
        });

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Check existing submission
        const existingSubmission = await prisma.submission.findUnique({
            where: {
                quizId_studentId: {
                    quizId,
                    studentId: session.user.id
                }
            }
        });

        if (existingSubmission) {
            return NextResponse.json({ error: 'You have already submitted this quiz' }, { status: 400 });
        }

        // Calculate Score
        let correctCount = 0;
        const totalQuestions = quiz.questions.length;

        const submissionAnswers = answers.map((ans: any) => {
            const question = quiz.questions.find(q => q.id === ans.questionId);
            if (!question) return null;

            const selectedOption = question.options.find(o => o.id === ans.selectedOptionId);
            if (!selectedOption) return null;

            const isCorrect = selectedOption.isCorrect;
            if (isCorrect) correctCount++;

            return {
                questionId: question.id,
                selectedOptionId: selectedOption.id,
                isCorrect
            };
        }).filter(Boolean);

        const score = (correctCount / totalQuestions) * 100;

        // Save Submission
        const submission = await prisma.submission.create({
            data: {
                quizId,
                studentId: session.user.id,
                score,
                answers: {
                    create: submissionAnswers
                }
            }
        });

        return NextResponse.json({ submission, score, totalQuestions, correctCount });

    } catch (error) {
        console.error('Quiz submission error:', error);
        return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
    }
}
