'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface Option {
    id: string
    text: string
}

interface Question {
    id: string
    text: string
    type: string
    options: Option[]
}

interface Quiz {
    id: string
    title: string
    professor: {
        subjectName: string
    }
    questions: Question[]
}

interface QuizResult {
    score: number
    correctCount: number
    totalQuestions: number
    submission: any
}

export default function TakeQuizPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [quiz, setQuiz] = useState<Quiz | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [result, setResult] = useState<QuizResult | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchQuiz = async () => {
            try {
                const res = await fetch(`/api/quiz/${params.id}`)
                if (!res.ok) throw new Error('Failed to load quiz')
                const data = await res.json()
                setQuiz(data.quiz)
            } catch (err) {
                setError('Quiz not found')
            } finally {
                setLoading(false)
            }
        }
        fetchQuiz()
    }, [params.id])

    const handleOptionSelect = (questionId: string, optionId: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }))
    }

    const handleSubmit = async () => {
        if (!quiz) return

        // Validate all questions answered
        const unanswered = quiz.questions.filter(q => !answers[q.id])
        if (unanswered.length > 0) {
            alert(`Please answer all questions before submitting. (${unanswered.length} remaining)`)
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                answers: Object.entries(answers).map(([qId, oId]) => ({
                    questionId: qId,
                    selectedOptionId: oId
                }))
            }

            const res = await fetch(`/api/quiz/${params.id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || 'Submission failed')
            }

            const data = await res.json()
            setResult(data)
        } catch (err: any) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>
    if (!quiz) return null

    if (result) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <Card className="text-center p-8 bg-white/90">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 p-4 rounded-full w-fit mb-4">
                            <CheckCircle className="h-12 w-12 text-green-600" />
                        </div>
                        <CardTitle className="text-3xl">Quiz Submitted!</CardTitle>
                        <CardDescription>You have successfully completed the quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-5xl font-bold text-primary-600">
                            {result.score.toFixed(0)}%
                        </div>
                        <p className="text-gray-600">
                            You got <span className="font-semibold text-gray-900">{result.correctCount}</span> out of <span className="font-semibold text-gray-900">{result.totalQuestions}</span> questions correct.
                        </p>
                    </CardContent>
                    <CardFooter className="justify-center gap-4">
                        <Button variant="outline" onClick={() => router.push('/student/quiz')}>
                            Back to Quiz List
                        </Button>
                        <Button onClick={() => router.push('/student/dashboard')}>
                            Go to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-gray-500 mt-2">Subject: {quiz.professor.subjectName} • {quiz.questions.length} Questions</p>
            </div>

            <div className="space-y-6">
                {quiz.questions.map((q, idx) => (
                    <Card key={q.id}>
                        <CardHeader className="pb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                                <span className="text-gray-400 mr-2">{idx + 1}.</span>
                                {q.text}
                            </h3>
                        </CardHeader>
                        <CardContent className="pt-2 grid gap-3">
                            {q.options.map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => handleOptionSelect(q.id, opt.id)}
                                    className={`
                    flex items-center p-4 rounded-lg border cursor-pointer transition-all
                    ${answers[q.id] === opt.id
                                            ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500'
                                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'}
                  `}
                                >
                                    <div className={`
                    w-5 h-5 rounded-full border flex items-center justify-center mr-3
                    ${answers[q.id] === opt.id ? 'border-primary-600' : 'border-gray-400'}
                  `}>
                                        {answers[q.id] === opt.id && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />
                                        )}
                                    </div>
                                    <span className={answers[q.id] === opt.id ? 'text-primary-900 font-medium' : 'text-gray-700'}>
                                        {opt.text}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end pt-4 pb-12">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    className="min-w-[200px]"
                >
                    Submit Quiz
                </Button>
            </div>
        </div>
    )
}
