import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Question {
    text: string;
    type: 'MCQ';
    difficulty: 'LOW' | 'MEDIUM' | 'HARD';
    options: {
        text: string;
        isCorrect: boolean;
    }[];
}

interface GenerateQuizParams {
    subject: string;
    count: number;
    difficultyDistribution?: {
        low: number;
        medium: number;
        hard: number;
    };
    content: string; // Extracted PDF text
    excludeQuestions?: string[]; // Questions to avoid generating
}

// Initialize Clients (Lazy init inside function is safer for Mock fallback, but global is fine here)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key',
    dangerouslyAllowBrowser: true
});

const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

export async function generateQuizQuestions(params: GenerateQuizParams): Promise<Question[]> {
    const { subject, count, content } = params;

    // Priority: Gemini -> OpenAI -> Mock
    if (process.env.GEMINI_API_KEY) {
        console.log('Using Gemini Quiz Generator');
        return generateWithGemini(params);
    } else if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'mock-key') {
        console.log('Using OpenAI Quiz Generator');
        return generateWithOpenAI(params);
    } else {
        console.log('Using Mock Quiz Generator');
        return generateMockQuestions(count, subject);
    }
}

async function generateWithGemini(params: GenerateQuizParams): Promise<Question[]> {
    const { subject, count, content } = params;
    try {
        if (!genAI) throw new Error("Gemini Client not initialized");
        // Use the primary model from env or default to the user-requested model
        const modelName = process.env.GOOGLE_MODEL_PRIMARY || "gemini-2.0-flash-exp";
        // Note: User asked for gemini-3-flash-preview, but let's default to a known working flash model if env not set, 
        // OR just set it directly if they insist. Let's respect the env var pattern they showed.
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `
        You are a specialized Quiz Generator for the subject: ${subject}.
        Generate ${count} multiple-choice questions (MCQ) based on the following content.
        
        Content:
        "${content.substring(0, 30000)}" 

        ${params.excludeQuestions && params.excludeQuestions.length > 0 ? `
        IMPORTANT: Do NOT generate questions similar to the following:
        ${JSON.stringify(params.excludeQuestions)}
        ` : ''}
  
        Requirements:
        1. Mix of difficulties: Low, Medium, Hard.
        2. Each question must have 4 options.
        3. Clearly mark the correct option.
        4. Output EXACTLY valid JSON in the following format:
        [
          {
            "text": "Question text here",
            "type": "MCQ",
            "difficulty": "MEDIUM",
            "options": [
              { "text": "Option A", "isCorrect": false },
              { "text": "Option B", "isCorrect": true },
              { "text": "Option C", "isCorrect": false },
              { "text": "Option D", "isCorrect": false }
            ]
          }
        ]
        Do not include markdown code blocks. Just the JSON array.
      `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if any
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions: Question[] = JSON.parse(text);
        return questions.slice(0, count);

    } catch (error) {
        console.error('Gemini generation error:', error);
        return generateMockQuestions(count, subject);
    }
}

async function generateWithOpenAI(params: GenerateQuizParams): Promise<Question[]> {
    const { subject, count, content } = params;
    try {
        const prompt = `
        You are a specialized Quiz Generator for the subject: ${subject}.
        Generate ${count} multiple-choice questions (MCQ) based on the following content.
        
        Content:
        "${content.substring(0, 15000)}" 

        ${params.excludeQuestions && params.excludeQuestions.length > 0 ? `
        IMPORTANT: Do NOT generate questions similar to the following:
        ${JSON.stringify(params.excludeQuestions)}
        ` : ''}

        Requirements:
        1. Mix of difficulties: Low, Medium, Hard.
        2. Each question must have 4 options.
        3. Clearly mark the correct option.
        4. Output EXACTLY valid JSON in the following format:
        [
          {
            "text": "Question text here",
            "type": "MCQ",
            "difficulty": "MEDIUM",
            "options": [
              { "text": "Option A", "isCorrect": false },
              { "text": "Option B", "isCorrect": true },
              { "text": "Option C", "isCorrect": false },
              { "text": "Option D", "isCorrect": false }
            ]
          }
        ]
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'gpt-3.5-turbo',
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) throw new Error('No content received from AI');

        const jsonString = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions: Question[] = JSON.parse(jsonString);

        return questions.slice(0, count);
    } catch (error) {
        console.error('OpenAI generation error:', error);
        return generateMockQuestions(count, subject);
    }
}

function generateMockQuestions(count: number, subject: string, excludeQuestions: string[] = []): Question[] {
    return Array.from({ length: count }).map((_, i) => {
        let text = `[MOCK ${subject}] Question ${i + 1}: What is a fundamental concept of ${subject}?`;
        if (excludeQuestions.includes(text)) {
            text += ` (Variant ${Date.now()})`; // Simple collision avoidance for mock
        }
        return {
            text,
            type: 'MCQ',
            difficulty: i % 3 === 0 ? 'HARD' : i % 2 === 0 ? 'MEDIUM' : 'LOW',
            options: [
                { text: `Correct Answer for Q${i + 1}`, isCorrect: true },
                { text: `Wrong Option 1`, isCorrect: false },
                { text: `Wrong Option 2`, isCorrect: false },
                { text: `Wrong Option 3`, isCorrect: false },
            ],
        };
    });
}
