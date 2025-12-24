'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return

    setIsInitializing(true)
    setError(null)

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText)
          stopScanner()
        },
        () => {
          // QR code not detected - ignore
        }
      )

      setIsScanning(true)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start camera'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsInitializing(false)
    }
  }, [onScan, onError, stopScanner])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="flex flex-col items-center space-y-6">
      <div
        ref={containerRef}
        className="relative w-full max-w-sm aspect-square bg-gray-900 rounded-2xl overflow-hidden"
      >
        <div id="qr-reader" className="w-full h-full" />

        {!isScanning && !isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white">
            <CameraOff className="w-12 h-12 mb-4 text-gray-400" />
            <p className="text-gray-400 text-sm">Camera not active</p>
          </div>
        )}

        {isInitializing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white">
            <Loader2 className="w-12 h-12 mb-4 animate-spin text-primary-400" />
            <p className="text-gray-400 text-sm">Starting camera...</p>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-primary-400 rounded-xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-400 rounded-br-lg" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary-400/50 animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="w-full max-w-sm p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700 text-sm text-center">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        {!isScanning ? (
          <Button
            onClick={startScanner}
            isLoading={isInitializing}
            className="gap-2"
          >
            <Camera className="w-5 h-5" />
            Start Scanning
          </Button>
        ) : (
          <Button onClick={stopScanner} variant="outline" className="gap-2">
            <CameraOff className="w-5 h-5" />
            Stop Scanning
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500 text-center max-w-xs">
        Position the QR code within the frame to scan and mark your attendance
      </p>
    </div>
  )
}

