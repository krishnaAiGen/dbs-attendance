'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Users, Calendar, Clock, ChevronRight, QrCode } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, PageLoader, Skeleton } from '@/components/ui'

interface Session {
  id: string
  subjectName: string
  createdAt: string
  expiresAt: string
  isActive: boolean
  attendanceCount: number
}

interface ActiveSession {
  id: string
  subjectName: string
  createdAt: string
  attendanceCount: number
}

export default function ProfessorDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'professor' && status === 'authenticated') {
      router.push('/student/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    async function fetchData() {
      try {
        const [sessionsRes, activeRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/sessions/active'),
        ])

        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          setSessions(data)
        }

        if (activeRes.ok) {
          const data = await activeRes.json()
          setActiveSession(data.session)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'professor') {
      fetchData()
    }
  }, [session])

  if (status === 'loading') {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'professor') {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalStudents = sessions.reduce((acc, s) => acc + s.attendanceCount, 0)
  const totalSessions = sessions.length
  const avgAttendance = totalSessions > 0 ? Math.round(totalStudents / totalSessions) : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, Prof. {session.user.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 mt-1">Manage your attendance sessions</p>
        </div>
        {activeSession ? (
          <Link href={`/professor/session/${activeSession.id}`}>
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <QrCode className="w-5 h-5" />
              View Active Session
            </Button>
          </Link>
        ) : (
          <Link href="/professor/session">
            <Button size="lg" className="gap-2 w-full sm:w-auto">
              <Plus className="w-5 h-5" />
              Start New Session
            </Button>
          </Link>
        )}
      </div>

      {activeSession && (
        <Card className="border-2 border-primary-200 bg-primary-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center">
                  <QrCode className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      Active Session
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Live
                    </span>
                  </div>
                  <p className="text-gray-600">{activeSession.subjectName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600">
                  {activeSession.attendanceCount}
                </p>
                <p className="text-sm text-gray-500">students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">Total Sessions</p>
                <p className="text-4xl font-bold mt-1">{totalSessions}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-accent-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent-100 text-sm font-medium">Total Attendance</p>
                <p className="text-4xl font-bold mt-1">{totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Avg per Session</p>
                <p className="text-4xl font-bold mt-1">{avgAttendance}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.filter((s) => !s.isActive).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No past sessions</h3>
              <p className="text-gray-500 mt-1">
                Start a new session to begin tracking attendance
              </p>
              <Link href="/professor/session">
                <Button className="mt-4 gap-2">
                  <Plus className="w-4 h-4" />
                  Start Session
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions
                .filter((s) => !s.isActive)
                .map((sessionItem, index) => (
                  <Link
                    key={sessionItem.id}
                    href={`/professor/session/${sessionItem.id}`}
                  >
                    <div
                      className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {sessionItem.subjectName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {sessionItem.subjectName}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(sessionItem.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(sessionItem.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {sessionItem.attendanceCount}
                          </p>
                          <p className="text-xs text-gray-500">students</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

