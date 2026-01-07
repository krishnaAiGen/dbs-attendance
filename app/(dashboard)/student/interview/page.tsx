'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileText,
  X,
  ChevronRight,
  Briefcase,
  Clock,
  Mic,
  MicOff,
  CheckCircle,
  AlertCircle,
  Volume2,
  Play,
  BrainCircuit,
  Sparkles,
} from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, PageLoader } from '@/components/ui'

// Stream options
const STREAMS = [
  { value: 'computer-science', label: 'Computer Science' },
  { value: 'mba', label: 'MBA' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'finance', label: 'Finance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'mechanical', label: 'Mechanical Engineering' },
  { value: 'electrical', label: 'Electrical Engineering' },
  { value: 'civil', label: 'Civil Engineering' },
  { value: 'healthcare', label: 'Healthcare' },
]

// Difficulty options
const DIFFICULTIES = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Entry level, fundamentals focus',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Mid-level, practical experience',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Senior level, deep expertise',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
]

// Duration options
const DURATIONS = [
  { value: 15, label: '15 min', questions: '~4 questions' },
  { value: 20, label: '20 min', questions: '~6 questions' },
  { value: 30, label: '30 min', questions: '~8 questions' },
  { value: 45, label: '45 min', questions: '~12 questions' },
]

export default function InterviewSetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Form state
  const [currentStep, setCurrentStep] = useState(1)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [stream, setStream] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [duration, setDuration] = useState<number | null>(null)
  
  // Mic test state
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [isTesting, setIsTesting] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [speakerTested, setSpeakerTested] = useState(false)
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'student' && status === 'authenticated') {
      router.push('/professor/dashboard')
    }
  }, [status, session, router])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // File handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      if (file.size <= 5 * 1024 * 1024) { // 5MB limit
        setResumeFile(file)
        setError(null)
      } else {
        setError('File size must be less than 5MB')
      }
    } else {
      setError('Please upload a PDF or DOCX file')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size <= 5 * 1024 * 1024) {
        setResumeFile(file)
        setError(null)
      } else {
        setError('File size must be less than 5MB')
      }
    }
  }, [])

  const removeFile = useCallback(() => {
    setResumeFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Microphone test
  const testMicrophone = async () => {
    setIsTesting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setMicPermission('granted')
      
      // Create audio context and analyser
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)
      analyserRef.current.fftSize = 256
      
      // Monitor audio levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      const updateLevel = () => {
        if (analyserRef.current && isTesting) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
          requestAnimationFrame(updateLevel)
        }
      }
      updateLevel()
      
      // Stop after 5 seconds
      setTimeout(() => {
        stopMicTest()
      }, 5000)
      
    } catch (err) {
      setMicPermission('denied')
      setIsTesting(false)
    }
  }

  const stopMicTest = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setIsTesting(false)
    setAudioLevel(0)
  }

  // Speaker test
  const testSpeaker = () => {
    const utterance = new SpeechSynthesisUtterance('Hello! This is a speaker test. Can you hear me clearly?')
    utterance.rate = 0.9
    utterance.onend = () => setSpeakerTested(true)
    speechSynthesis.speak(utterance)
  }

  // Form validation
  const isStep1Complete = resumeFile !== null
  const isStep2Complete = stream !== '' && difficulty !== '' && duration !== null
  const isStep3Complete = micPermission === 'granted'
  const canStartInterview = isStep1Complete && isStep2Complete && isStep3Complete

  // Start interview
  const handleStartInterview = async () => {
    if (!canStartInterview) return
    
    setIsSubmitting(true)
    setError(null)
    
    try {
      // In a real app, this would upload the resume and create an interview session
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirect to interview room (placeholder)
      // router.push(`/student/interview/${sessionId}`)
      alert('Interview feature coming soon! Backend API integration required.')
      
    } catch (err) {
      setError('Failed to start interview. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'student') {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/student/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BrainCircuit className="w-7 h-7 text-primary-600" />
            AI Interview
          </h1>
          <p className="text-gray-500">Prepare and take your AI-powered mock interview</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all
                ${currentStep === step
                  ? 'bg-primary-600 text-white'
                  : step < currentStep || (step === 1 && isStep1Complete) || (step === 2 && isStep2Complete) || (step === 3 && isStep3Complete)
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-400'
                }
              `}
            >
              {(step === 1 && isStep1Complete) || (step === 2 && isStep2Complete) || (step === 3 && isStep3Complete)
                ? <CheckCircle className="w-5 h-5" />
                : step
              }
            </button>
            {step < 3 && (
              <div className={`w-16 h-1 mx-2 rounded ${
                step < currentStep ? 'bg-primary-400' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Resume Upload */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary-600" />
              Upload Your Resume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                ${isDragging
                  ? 'border-primary-500 bg-primary-50'
                  : resumeFile
                  ? 'border-primary-300 bg-primary-50/50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {resumeFile ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{resumeFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(resumeFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile()
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Drag & drop your resume here
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse • PDF or DOCX • Max 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!isStep1Complete}
                className="gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configuration */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              Interview Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Stream Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">
                Select Your Stream
              </label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white"
              >
                <option value="">Choose a stream...</option>
                {STREAMS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">
                Select Difficulty
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${difficulty === d.value
                        ? `${d.color} border-current`
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <p className="font-semibold">{d.label}</p>
                    <p className="text-sm opacity-75">{d.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Interview Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`
                      p-4 rounded-xl border-2 text-center transition-all
                      ${duration === d.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <p className="font-bold text-lg">{d.label}</p>
                    <p className="text-xs opacity-75">{d.questions}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!isStep2Complete}
                className="gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Pre-Interview Checklist */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary-600" />
              Pre-Interview Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Microphone Test */}
            <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {micPermission === 'granted' ? (
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Mic className="w-5 h-5 text-emerald-600" />
                    </div>
                  ) : micPermission === 'denied' ? (
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <MicOff className="w-5 h-5 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                      <Mic className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">Microphone</p>
                    <p className="text-sm text-gray-500">
                      {micPermission === 'granted'
                        ? 'Microphone access granted'
                        : micPermission === 'denied'
                        ? 'Microphone access denied - please enable in browser settings'
                        : 'Test your microphone before starting'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  variant={micPermission === 'granted' ? 'outline' : 'primary'}
                  size="sm"
                  onClick={isTesting ? stopMicTest : testMicrophone}
                  disabled={micPermission === 'denied'}
                >
                  {isTesting ? 'Stop' : micPermission === 'granted' ? 'Test Again' : 'Test Mic'}
                </Button>
              </div>
              
              {/* Audio Level Indicator */}
              {isTesting && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Speak now to test your microphone...</p>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-primary-500 transition-all duration-100"
                      style={{ width: `${audioLevel * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Speaker Test */}
            <div className="p-6 bg-gray-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    speakerTested ? 'bg-emerald-100' : 'bg-gray-200'
                  }`}>
                    <Volume2 className={`w-5 h-5 ${speakerTested ? 'text-emerald-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Speaker</p>
                    <p className="text-sm text-gray-500">
                      {speakerTested ? 'Speaker tested successfully' : 'Test your audio output'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testSpeaker}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Test Speaker
                </Button>
              </div>
            </div>

            {/* Reminders */}
            <div className="space-y-3">
              <p className="font-semibold text-gray-700">Before you start:</p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Find a quiet environment with minimal background noise
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Ensure stable internet connection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Keep your resume handy for reference
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Interview will be recorded for evaluation
                </li>
              </ul>
            </div>

            {/* Summary */}
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
              <p className="font-semibold text-primary-800 mb-2">Interview Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-primary-600">Stream:</p>
                <p className="text-primary-800 font-medium">
                  {STREAMS.find(s => s.value === stream)?.label || '-'}
                </p>
                <p className="text-primary-600">Difficulty:</p>
                <p className="text-primary-800 font-medium capitalize">{difficulty || '-'}</p>
                <p className="text-primary-600">Duration:</p>
                <p className="text-primary-800 font-medium">
                  {duration ? `${duration} minutes` : '-'}
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
              >
                Back
              </Button>
              <Button
                onClick={handleStartInterview}
                disabled={!canStartInterview || isSubmitting}
                isLoading={isSubmitting}
                className="gap-2"
                size="lg"
              >
                <Sparkles className="w-5 h-5" />
                Start Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

