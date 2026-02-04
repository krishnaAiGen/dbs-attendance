'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react'

interface Option {
    text: string
    isCorrect: boolean
}

interface Question {
    text: string
    type: string
    difficulty: string
    options: Option[]
}

const SUBJECTS = [
    { value: 'science', label: 'Science' },
    { value: 'finance', label: 'Finance' },
    { value: 'technology', label: 'Technology' },
    { value: 'general', label: 'General' },
]

export default function CreateQuizPage() {
    const router = useRouter()
    const [step, setStep] = useState<'upload' | 'review'>('upload')
    const [isLoading, setIsLoading] = useState(false)

    // Form State
    const [file, setFile] = useState<File | null>(null)
    const [subject, setSubject] = useState('')
    const [count, setCount] = useState(5)
    const [title, setTitle] = useState('')
    const [deadline, setDeadline] = useState('')

    // Generated State
    const [questions, setQuestions] = useState<Question[]>([])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleGenerate = async () => {
        if (!file || !subject || !title) return

        setIsLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('subject', subject)
            formData.append('count', count.toString())

            const res = await fetch('/api/quiz/generate', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) throw new Error('Failed to generate quiz')

            const data = await res.json()
            setQuestions(data.questions)
            setStep('review')
        } catch (error) {
            console.error(error)
            // Ideally show toast error here
            alert('Failed to generate quiz. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePublish = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    subject,
                    deadline,
                    questions,
                }),
            })

            if (!res.ok) throw new Error('Failed to publish quiz')

            router.push('/professor/dashboard') // Redirect back to dashboard
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Failed to publish quiz')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Create New Quiz</h1>
                <p className="mt-2 text-gray-600">Upload a PDF to automatically generate questions using AI.</p>
            </div>

            {step === 'upload' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Quiz Details & Source Material</CardTitle>
                        <CardDescription>
                            Configure the quiz settings and upload your source content.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Quiz Title"
                                placeholder="e.g., Chapter 1 Assessment"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Subject</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                >
                                    <option value="">Select a Subject</option>
                                    {SUBJECTS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Number of Questions"
                                type="number"
                                min={1}
                                max={20}
                                value={count}
                                onChange={(e) => setCount(parseInt(e.target.value))}
                            />

                            <Input
                                label="Deadline (Optional)"
                                type="datetime-local"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Upload PDF</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    id="pdf-upload"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="h-10 w-10 text-gray-400 mb-4" />
                                    <span className="text-sm text-gray-600">
                                        {file ? file.name : 'Click to upload PDF or drag and drop'}
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleGenerate}
                                disabled={!file || !subject || !title || isLoading}
                                isLoading={isLoading}
                            >
                                {isLoading ? 'Generating Questions...' : 'Generate Questions'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 'review' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Review Generated Questions</CardTitle>
                                <CardDescription>Review and verify the AI-generated questions before publishing.</CardDescription>
                            </div>
                            <Button variant="ghost" onClick={() => setStep('upload')}>
                                Back to Edit
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {questions.map((q, idx) => (
                                <div key={idx} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2
                        ${q.difficulty === 'HARD' ? 'bg-red-100 text-red-800' :
                                                    q.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'}`}>
                                                {q.difficulty}
                                            </span>
                                            <h4 className="text-lg font-medium text-gray-900">
                                                {idx + 1}. {q.text}
                                            </h4>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    // Regenerate
                                                    if (!file || !subject) return;

                                                    // Set local loading state if needed, or global
                                                    // Ideally we need a per-question loading state. 
                                                    // For simplicity, let's toggle a "regenerating" state on this index if we had it,
                                                    // or just use global loader but that blocks everything.
                                                    // Let's us global isLoading for now to be safe and simple.
                                                    setIsLoading(true);

                                                    try {
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        formData.append('subject', subject);
                                                        formData.append('count', '1');
                                                        formData.append('excludeQuestions', JSON.stringify(questions.map(q => q.text)));

                                                        const res = await fetch('/api/quiz/generate', { method: 'POST', body: formData });
                                                        if (!res.ok) throw new Error('Failed to regenerate');

                                                        const data = await res.json();
                                                        if (data.questions && data.questions.length > 0) {
                                                            const newQuestions = [...questions];
                                                            newQuestions[idx] = data.questions[0];
                                                            setQuestions(newQuestions);
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('Failed to regenerate question');
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                                                disabled={isLoading}
                                            >
                                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newQuestions = questions.filter((_, i) => i !== idx);
                                                    setQuestions(newQuestions);
                                                }}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                disabled={isLoading}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                                        {q.options.map((opt, optIdx) => (
                                            <div
                                                key={optIdx}
                                                className={`flex items-center p-3 rounded-lg border 
                          ${opt.isCorrect ? 'bg-green-50 border-green-200 ring-1 ring-green-200' : 'bg-white border-gray-200'}`}
                                            >
                                                {opt.isCorrect ? (
                                                    <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                                                ) : (
                                                    <div className="h-4 w-4 mr-2" />
                                                )}
                                                <span className={`text-sm ${opt.isCorrect ? 'text-green-900 font-medium' : 'text-gray-700'}`}>
                                                    {opt.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button variant="ghost" onClick={() => setQuestions([])}>
                            Discard
                        </Button>
                        <Button onClick={handlePublish} isLoading={isLoading}>
                            Publish Quiz
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
