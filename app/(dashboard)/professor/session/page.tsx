'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Users, StopCircle, Loader2 } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, PageLoader } from '@/components/ui'
import { QRDisplay } from '@/components/qr-display'

interface ActiveSession {
  id: string
  subjectName: string
  createdAt: string
  expiresAt: string
  attendanceCount: number
}

export default function ProfessorSessionPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [attendanceCount, setAttendanceCount] = useState(0)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'professor' && status === 'authenticated') {
      router.push('/student/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    async function checkActiveSession() {
      try {
        const response = await fetch('/api/sessions/active')
        if (response.ok) {
          const data = await response.json()
          if (data.session) {
            setActiveSession(data.session)
            setAttendanceCount(data.session.attendanceCount)
          }
        }
      } catch (error) {
        console.error('Failed to check active session:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'professor') {
      checkActiveSession()
    }
  }, [session])

  // Poll for attendance count updates
  useEffect(() => {
    if (!activeSession) return

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sessions/${activeSession.id}`)
        if (response.ok) {
          const data = await response.json()
          setAttendanceCount(data.attendanceCount)
        }
      } catch (error) {
        console.error('Failed to fetch attendance count:', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [activeSession])

  const createSession = useCallback(async () => {
    setCreating(true)
    setError(null)
    setLocationError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      })

      const data = await response.json()

      if (response.ok) {
        setActiveSession({
          id: data.id,
          subjectName: data.subjectName,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          attendanceCount: 0,
        })
        setAttendanceCount(0)
      } else {
        setError(data.error || 'Failed to create session')
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        const messages: Record<number, string> = {
          1: 'Location access denied. Please enable location permissions.',
          2: 'Unable to determine location. Please try again.',
          3: 'Location request timed out. Please try again.',
        }
        setLocationError(messages[err.code] || 'Location error occurred')
      } else {
        setError('Failed to create session')
      }
    } finally {
      setCreating(false)
    }
  }, [])

  const endSession = async () => {
    if (!activeSession) return

    setEnding(true)
    try {
      const response = await fetch(`/api/sessions/${activeSession.id}`, {
        method: 'PATCH',
      })

      if (response.ok) {
        router.push(`/professor/session/${activeSession.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to end session')
      }
    } catch {
      setError('Failed to end session')
    } finally {
      setEnding(false)
    }
  }

  if (status === 'loading' || loading) {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'professor') {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/professor/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeSession ? 'Active Session' : 'New Session'}
          </h1>
          <p className="text-gray-500">
            {activeSession
              ? activeSession.subjectName
              : 'Start a new attendance session'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {locationError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          {locationError}
        </div>
      )}

      {!activeSession ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto">
                <MapPin className="w-10 h-10 text-primary-600" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Create Attendance Session
                </h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                  We&apos;ll use your current location to verify that students are in
                  the classroom when they scan the QR code.
                </p>
              </div>

              <Button
                onClick={createSession}
                size="lg"
                className="gap-2"
                isLoading={creating}
              >
                {creating ? (
                  'Getting Location...'
                ) : (
                  <>
                    <MapPin className="w-5 h-5" />
                    Start Session
                  </>
                )}
              </Button>

              <p className="text-sm text-gray-400">
                Location permissions are required
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="border-2 border-primary-200">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Session Active
                </span>
              </div>
              <CardTitle className="text-xl">{activeSession.subjectName}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-4">
              <QRDisplay sessionId={activeSession.id} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Students Marked</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {attendanceCount}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={endSession}
                  variant="danger"
                  className="gap-2"
                  isLoading={ending}
                >
                  <StopCircle className="w-5 h-5" />
                  End Session
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500">
            <p>QR code refreshes every 30 seconds for security</p>
            <p>Students must be within 100m to mark attendance</p>
          </div>
        </div>
      )}
    </div>
  )
}

