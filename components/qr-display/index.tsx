'use client'

import { useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { Spinner } from '@/components/ui'
import { RefreshCw, Maximize2, X } from 'lucide-react'

// Get refresh interval from env (default: 30 seconds)
const DEFAULT_REFRESH_MS = (parseInt(process.env.NEXT_PUBLIC_QR_REFRESH_SECONDS || '30', 10)) * 1000

interface QRDisplayProps {
  sessionId: string
  refreshInterval?: number
  onRefresh?: () => void
}

export function QRDisplay({
  sessionId,
  refreshInterval = DEFAULT_REFRESH_MS,
  onRefresh,
}: QRDisplayProps) {
  const [qrImage, setQrImage] = useState<string>('')
  const [qrImageLarge, setQrImageLarge] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(refreshInterval / 1000)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fetchQRPayload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/sessions/${sessionId}/qr`)
      if (!response.ok) {
        throw new Error('Failed to fetch QR code')
      }

      // API now returns just a short token
      const { token } = await response.json()

      // Generate QR with just the short token - MUCH simpler!
      const qrDataUrl = await QRCode.toDataURL(token, {
        width: 450,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })

      // Generate larger QR for fullscreen mode
      const qrDataUrlLarge = await QRCode.toDataURL(token, {
        width: 1500,
        margin: 8,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })

      setQrImage(qrDataUrl)
      setQrImageLarge(qrDataUrlLarge)
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

  // Handle ESC key to close fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }
    
    if (isFullscreen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

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
    <>
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          {loading && !qrImage ? (
            <div className="w-[400px] h-[400px] flex items-center justify-center bg-white rounded-2xl border-2 border-gray-100">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100">
              <img
                src={qrImage}
                alt="Attendance QR Code"
                className="w-[400px] h-[400px]"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          )}
        </div>

        {/* Maximize Button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium shadow-lg"
        >
          <Maximize2 className="w-5 h-5" />
          Maximize QR
        </button>

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
          Students must scan this QR code within {process.env.NEXT_PUBLIC_MAX_DISTANCE_METERS || '100'} meters of your location.
        </p>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center"
          onClick={() => setIsFullscreen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-3 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-8 h-8 text-gray-700" />
          </button>

          {/* Large QR Code */}
          <div 
            className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={qrImageLarge}
              alt="Attendance QR Code"
              className="w-[85vmin] h-[85vmin] max-w-[1500px] max-h-[1500px]"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Countdown in fullscreen */}
          <div className="mt-8 flex flex-col items-center space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-2xl font-bold">
                Refreshing in {countdown}s
              </span>
            </div>
            <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-1000"
                style={{
                  width: `${(countdown / (refreshInterval / 1000)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Instructions */}
          <p className="mt-6 text-xl text-gray-500">
            Press <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700 font-mono">ESC</kbd> or click anywhere to exit
          </p>
        </div>
      )}
    </>
  )
}
