'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Calendar, Clock, Mail, Download, StopCircle, QrCode } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, PageLoader, Skeleton } from '@/components/ui'

interface Student {
  id: string
  name: string
  email: string
  markedAt: string
  distanceMeters: number
}

interface SessionDetails {
  id: string
  subjectName: string
  professorName: string
  createdAt: string
  expiresAt: string
  isActive: boolean
  attendanceCount: number
  students: Student[]
}

export default function SessionDetailsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [ending, setEnding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'professor' && status === 'authenticated') {
      router.push('/student/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/sessions/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setSessionDetails(data)
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to fetch session')
        }
      } catch {
        setError('Failed to fetch session')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'professor' && params.id) {
      fetchSession()
    }
  }, [session, params.id])

  if (status === 'loading' || loading) {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'professor') {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const downloadCSV = () => {
    if (!sessionDetails) return

    const headers = ['Name', 'Email', 'Time Marked']
    const rows = sessionDetails.students.map((s) => [
      s.name,
      s.email,
      new Date(s.markedAt).toLocaleString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${sessionDetails.subjectName}-${formatDate(sessionDetails.createdAt)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const endSession = async () => {
    if (!sessionDetails) return

    setEnding(true)
    try {
      const response = await fetch(`/api/sessions/${sessionDetails.id}`, {
        method: 'PATCH',
      })

      if (response.ok) {
        setSessionDetails({ ...sessionDetails, isActive: false })
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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600">{error}</p>
            <Link href="/professor/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/professor/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {sessionDetails?.subjectName || 'Session Details'}
          </h1>
          <p className="text-gray-500">
            {sessionDetails ? formatDate(sessionDetails.createdAt) : ''}
          </p>
        </div>
        {sessionDetails && sessionDetails.students.length > 0 && (
          <Button variant="outline" onClick={downloadCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        )}
      </div>

      {sessionDetails && (
        <>
          {/* Active Session Banner */}
          {sessionDetails.isActive && (
            <Card className="border-2 border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                      <QrCode className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          Session is Active
                        </h3>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Live
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">
                        Students can still scan the QR code to mark attendance
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <Link href="/professor/session" className="flex-1 sm:flex-none">
                      <Button variant="outline" className="gap-2 w-full">
                        <QrCode className="w-4 h-4" />
                        Show QR
                      </Button>
                    </Link>
                    <Button
                      onClick={endSession}
                      variant="danger"
                      className="gap-2 flex-1 sm:flex-none"
                      isLoading={ending}
                    >
                      <StopCircle className="w-4 h-4" />
                      End Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {sessionDetails.attendanceCount}
                    </p>
                    <p className="text-sm text-gray-500">Students</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatDate(sessionDetails.createdAt).split(',')[0]}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(sessionDetails.createdAt).split(',').slice(1).join(',')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {formatTime(sessionDetails.createdAt)}
                    </p>
                    <p className="text-sm text-gray-500">Started</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Attendance List</span>
                <span className="text-sm font-normal text-gray-500">
                  {sessionDetails.students.length} students
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionDetails.students.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">
                    No attendance records
                  </h3>
                  <p className="text-gray-500 mt-1">
                    No students marked attendance for this session
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Student
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionDetails.students.map((student, index) => (
                        <tr
                          key={student.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                                {student.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-900">
                                {student.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span className="text-sm">{student.email}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">
                                {formatTime(student.markedAt)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

