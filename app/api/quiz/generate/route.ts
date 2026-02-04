import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parsePdf } from '@/lib/pdf-parser';
import { generateQuizQuestions } from '@/lib/quiz-generator';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'professor') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const subject = formData.get('subject') as string;
        const count = parseInt(formData.get('count') as string || '5');

        if (!file || !subject) {
            return NextResponse.json({ error: 'Missing file or subject' }, { status: 400 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse PDF
        const content = await parsePdf(buffer);

        const excludeQuestionsRaw = formData.get('excludeQuestions') as string;
        const excludeQuestions = excludeQuestionsRaw ? JSON.parse(excludeQuestionsRaw) : [];

        // Generate Questions
        const questions = await generateQuizQuestions({
            subject,
            count,
            content,
            excludeQuestions,
        });

        return NextResponse.json({ questions });
    } catch (error) {
        console.error('Quiz generation error:', error);
        return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
    }
}
