'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Users, Trophy, Target, TrendingUp } from 'lucide-react'

interface Submission {
    id: string
    score: number
    submittedAt: string
    student: {
        fullName: string
        email: string
    }
}

interface Analytics {
    quizTitle: string
    totalSubmissions: number
    meanScore: number
    passedCount: number
    submissions: Submission[]
}

export default function QuizAnalyticsPage({ params }: { params: { id: string } }) {
    const [data, setData] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch(`/api/quiz/${params.id}/submissions`)
                if (res.ok) {
                    const json = await res.json()
                    setData(json)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchAnalytics()
    }, [params.id])

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    if (!data) return <div className="p-8 text-center">Failed to load data</div>

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{data.quizTitle}</h1>
                <p className="mt-2 text-gray-600">Performance Overview</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                        <Users className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalSubmissions}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mean Score</CardTitle>
                        <Target className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.meanScore.toFixed(1)}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-gray-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.totalSubmissions > 0
                                ? ((data.passedCount / data.totalSubmissions) * 100).toFixed(1)
                                : 0}%
                        </div>
                        <p className="text-xs text-gray-500">{data.passedCount} passed</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Student Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="pb-3 font-medium">Student</th>
                                    <th className="pb-3 font-medium">Score</th>
                                    <th className="pb-3 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.submissions.map((sub) => (
                                    <tr key={sub.id}>
                                        <td className="py-3">
                                            <div className="font-medium">{sub.student.fullName}</div>
                                            <div className="text-gray-500 text-xs">{sub.student.email}</div>
                                        </td>
                                        <td className="py-3 font-semibold">
                                            <span className={sub.score >= 50 ? 'text-green-600' : 'text-red-600'}>
                                                {sub.score.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500">
                                            {new Date(sub.submittedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {data.submissions.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-gray-500">
                                            No submissions yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
