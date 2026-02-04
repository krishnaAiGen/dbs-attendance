'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BadgeCheck, Clock, BookOpen, AlertCircle } from 'lucide-react'

interface Quiz {
    id: string
    title: string
    subject: string
    deadline: string | null
    professor: {
        subjectName: string
    }
    _count: {
        questions: number
    }
    submissions: {
        id: string
        score: number
    }[]
}

export default function StudentQuizList() {
    const router = useRouter()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const res = await fetch('/api/quiz')
                if (res.ok) {
                    const data = await res.json()
                    setQuizzes(data.quizzes)
                }
            } catch (error) {
                console.error('Failed to fetch quizzes', error)
            } finally {
                setIsLoading(false)
            }
        }
        fetchQuizzes()
    }, [])

    if (isLoading) {
        return <div className="flex justify-center p-8">Loading quizzes...</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Available Quizzes</h1>
                <p className="mt-2 text-gray-600">Take quizzes assigned by your professors.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => {
                    const isTaken = quiz.submissions.length > 0
                    const score = isTaken ? quiz.submissions[0].score : null

                    return (
                        <Card key={quiz.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 mb-2">
                                            {quiz.subject}
                                        </span>
                                        <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                                    </div>
                                    {isTaken && (
                                        <BadgeCheck className="text-green-500 h-6 w-6" />
                                    )}
                                </div>
                                <CardDescription>{quiz.professor.subjectName}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                                <div className="flex items-center text-sm text-gray-500">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    {quiz._count.questions} Questions
                                </div>
                                {quiz.deadline && (
                                    <div className="flex items-center text-sm text-gray-500">
                                        <Clock className="mr-2 h-4 w-4" />
                                        Due: {new Date(quiz.deadline).toLocaleDateString()}
                                    </div>
                                )}

                                {isTaken && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-medium text-gray-900">Score: {score?.toFixed(1)}%</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    variant={isTaken ? "outline" : "primary"}
                                    onClick={() => router.push(`/student/quiz/${quiz.id}`)}
                                    disabled={isTaken}
                                >
                                    {isTaken ? 'Completed' : 'Start Quiz'}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}

                {quizzes.length === 0 && (
                    <div className="col-span-full p-12 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                        <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No quizzes available</h3>
                        <p>Check back later for new assignments.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
