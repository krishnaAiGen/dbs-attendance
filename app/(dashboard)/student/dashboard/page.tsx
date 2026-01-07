'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QrCode, Calendar, Clock, BookOpen } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, PageLoader, Skeleton } from '@/components/ui'

interface AttendanceRecord {
  id: string
  sessionId: string
  subjectName: string
  professorName: string
  sessionDate: string
  markedAt: string
  distanceMeters: number
}

export default function StudentDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'student' && status === 'authenticated') {
      router.push('/professor/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const response = await fetch('/api/attendance')
        if (response.ok) {
          const data = await response.json()
          setRecords(data)
        }
      } catch (error) {
        console.error('Failed to fetch attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'student') {
      fetchAttendance()
    }
  }, [session])

  if (status === 'loading') {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'student') {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {session.user.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-500 mt-1">Track your attendance history</p>
        </div>
        <Link href="/student/scan">
          <Button size="lg" className="gap-2 w-full sm:w-auto">
            <QrCode className="w-5 h-5" />
            Scan QR Code
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm font-medium">Total Classes</p>
                <p className="text-4xl font-bold mt-1">{records.length}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent-500 to-accent-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-accent-100 text-sm font-medium">This Month</p>
                <p className="text-4xl font-bold mt-1">
                  {records.filter((r) => {
                    const recordDate = new Date(r.markedAt)
                    const now = new Date()
                    return (
                      recordDate.getMonth() === now.getMonth() &&
                      recordDate.getFullYear() === now.getFullYear()
                    )
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
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
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No attendance records</h3>
              <p className="text-gray-500 mt-1">
                Scan a QR code in class to mark your attendance
              </p>
              <Link href="/student/scan">
                <Button className="mt-4 gap-2">
                  <QrCode className="w-4 h-4" />
                  Scan Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {record.subjectName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {record.subjectName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Prof. {record.professorName}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {formatDate(record.sessionDate)}
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 mt-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(record.markedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

