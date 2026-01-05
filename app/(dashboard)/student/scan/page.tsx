'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, MapPin, Clock, Loader2 } from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardContent, PageLoader } from '@/components/ui'
import { QRScanner } from '@/components/qr-scanner'

interface ScanResult {
  success: boolean
  message: string
  subjectName?: string
  distance?: number
  markedAt?: string
  error?: string
}

export default function StudentScanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [scanning, setScanning] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const handleScan = useCallback(async (data: string) => {
    setScanning(false)
    setSubmitting(true)
    setLocationError(null)

    try {
      // Parse QR data
      const qrData = JSON.parse(data)

      // Get student's location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords

      // Submit attendance
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: qrData.sessionId,
          timestamp: qrData.timestamp,
          nonce: qrData.nonce,
          signature: qrData.signature,
          studentLatitude: latitude,
          studentLongitude: longitude,
        }),
      })

      const responseData = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Attendance marked successfully!',
          subjectName: responseData.subjectName,
          distance: responseData.distance,
          markedAt: responseData.markedAt,
        })
      } else {
        setResult({
          success: false,
          message: responseData.error || 'Failed to mark attendance',
          distance: responseData.distance,
          error: responseData.error,
        })
      }
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        const messages: Record<number, string> = {
          1: 'Location access denied. Please enable location permissions.',
          2: 'Unable to determine location. Please try again.',
          3: 'Location request timed out. Please try again.',
        }
        setLocationError(messages[error.code] || 'Location error occurred')
        setResult({
          success: false,
          message: messages[error.code] || 'Location error occurred',
        })
      } else {
        setResult({
          success: false,
          message: 'Invalid QR code or network error',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }, [])

  const handleRetry = () => {
    setResult(null)
    setScanning(true)
    setLocationError(null)
  }

  if (status === 'loading') {
    return <PageLoader />
  }

  if (!session || session.user.role !== 'student') {
    router.push('/login')
    return null
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/student/dashboard"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan QR Code</h1>
          <p className="text-gray-500">Mark your attendance</p>
        </div>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>
            {scanning
              ? 'Position QR Code in Frame'
              : submitting
              ? 'Processing...'
              : result?.success
              ? 'Success!'
              : 'Scan Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scanning && !submitting && (
            <QRScanner onScan={handleScan} onError={(err) => setLocationError(err)} />
          )}

          {submitting && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary-200 rounded-full" />
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary-600 rounded-full border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-900">Verifying attendance...</p>
                <p className="text-sm text-gray-500 mt-1">
                  Checking your location and QR code
                </p>
              </div>
            </div>
          )}

          {result && !submitting && (
            <div className="space-y-6">
              <div
                className={`flex flex-col items-center py-8 px-4 rounded-2xl ${
                  result.success
                    ? 'bg-emerald-50'
                    : 'bg-red-50'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                ) : (
                  <XCircle className="w-16 h-16 text-red-500 mb-4" />
                )}

                <h3
                  className={`text-xl font-bold ${
                    result.success ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </h3>

                {result.success && result.subjectName && (
                  <p className="text-emerald-600 mt-2">{result.subjectName}</p>
                )}

                {result.distance !== undefined && (
                  <div className="flex items-center gap-2 mt-4 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span>
                      {result.distance}m from classroom
                      {result.distance > 100 && (
                        <span className="text-red-600"> (max: 100m)</span>
                      )}
                    </span>
                  </div>
                )}

                {result.success && result.markedAt && (
                  <div className="flex items-center gap-2 mt-2 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <span>
                      {new Date(result.markedAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {result.success ? (
                  <Link href="/student/dashboard">
                    <Button className="w-full" size="lg">
                      Back to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button onClick={handleRetry} size="lg">
                      Try Again
                    </Button>
                    <Link href="/student/dashboard">
                      <Button variant="outline" className="w-full">
                        Back to Dashboard
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {locationError && !result && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mt-4">
              <p className="text-amber-700 text-sm">{locationError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>Make sure you&apos;re within {process.env.NEXT_PUBLIC_MAX_DISTANCE_METERS || '100'} meters of the classroom</p>
        <p>and location services are enabled</p>
      </div>
    </div>
  )
}

