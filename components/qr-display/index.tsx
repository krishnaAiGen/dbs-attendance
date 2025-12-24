'use client'

import { useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { Spinner } from '@/components/ui'
import { RefreshCw } from 'lucide-react'

interface QRDisplayProps {
  sessionId: string
  refreshInterval?: number
  onRefresh?: () => void
}

interface QRData {
  sessionId: string
  timestamp: number
  nonce: string
  signature: string
}

export function QRDisplay({
  sessionId,
  refreshInterval = 30000,
  onRefresh,
}: QRDisplayProps) {
  const [qrImage, setQrImage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(refreshInterval / 1000)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchQRPayload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/sessions/${sessionId}/qr`)
      if (!response.ok) {
        throw new Error('Failed to fetch QR code')
      }

      const data: QRData = await response.json()
      const qrString = JSON.stringify(data)

      const qrDataUrl = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0c4a6e',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })

      setQrImage(qrDataUrl)
      setLastRefresh(Date.now())
      setCountdown(refreshInterval / 1000)
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }, [sessionId, refreshInterval, onRefresh])

  useEffect(() => {
    fetchQRPayload()

    const refreshTimer = setInterval(fetchQRPayload, refreshInterval)

    return () => clearInterval(refreshTimer)
  }, [fetchQRPayload, refreshInterval])

  useEffect(() => {
    const countdownTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefresh) / 1000)
      const remaining = Math.max(0, refreshInterval / 1000 - elapsed)
      setCountdown(remaining)
    }, 1000)

    return () => clearInterval(countdownTimer)
  }, [lastRefresh, refreshInterval])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-red-500 text-center">
          <p className="font-medium">Error loading QR code</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchQRPayload}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        {loading && !qrImage ? (
          <div className="w-[300px] h-[300px] flex items-center justify-center bg-gray-50 rounded-2xl">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-white p-4 rounded-2xl shadow-xl">
              <img
                src={qrImage}
                alt="Attendance QR Code"
                className="w-[300px] h-[300px]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            Refreshing in {countdown}s
          </span>
        </div>
        <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-1000"
            style={{
              width: `${(countdown / (refreshInterval / 1000)) * 100}%`,
            }}
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 text-center max-w-xs">
        Students must scan this QR code within 100 meters of your location to mark attendance
      </p>
    </div>
  )
}

