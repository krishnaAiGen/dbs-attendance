'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, BarChart2, BookOpen, Trash2 } from 'lucide-react'

interface Quiz {
    id: string
    title: string
    subject: string
    _count: {
        questions: number
    }
}

export default function ProfessorQuizList() {
    const router = useRouter()
    const [quizzes, setQuizzes] = useState<Quiz[]>([])

    useEffect(() => {
        // Reusing the same API. Note: In real app, we might want to filter this to only show quizzes 
        // created by THIS professor, but the prompt implies simple visibility.
        // Ideally GET /api/quiz should filter by professorId if the user is a professor? 
        // Currently GET /api/quiz returns all. Let's assume that's fine for this scope.
        const fetchQuizzes = async () => {
            const res = await fetch('/api/quiz')
            if (res.ok) {
                const data = await res.json()
                setQuizzes(data.quizzes)
            }
        }
        fetchQuizzes()
    }, [])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Quizzes</h1>
                    <p className="mt-2 text-gray-600">Create new quizzes and view analytics.</p>
                </div>
                <Button onClick={() => router.push('/professor/quiz/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Quiz
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                    <Card key={quiz.id}>
                        <CardHeader>
                            <CardTitle className="line-clamp-1">{quiz.title}</CardTitle>
                            <CardDescription className="capitalize">{quiz.subject}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-gray-500">
                                <BookOpen className="mr-2 h-4 w-4" />
                                {quiz._count.questions} Questions
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => router.push(`/professor/quiz/${quiz.id}`)}
                            >
                                <BarChart2 className="mr-2 h-4 w-4" />
                                Analytics
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                className="px-3"
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to delete this quiz?')) return;
                                    try {
                                        const res = await fetch(`/api/quiz/${quiz.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                            setQuizzes(quizzes.filter(q => q.id !== quiz.id));
                                        } else {
                                            alert('Failed to delete quiz');
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert('Error deleting quiz');
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}
