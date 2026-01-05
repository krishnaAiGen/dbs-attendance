'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, CameraOff, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [maxZoom, setMaxZoom] = useState(1)
  const [supportsZoom, setSupportsZoom] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)

  const applyZoom = useCallback(async (newZoom: number) => {
    if (trackRef.current && supportsZoom) {
      try {
        await trackRef.current.applyConstraints({
          advanced: [{ zoom: newZoom } as MediaTrackConstraintSet]
        })
        setZoom(newZoom)
      } catch (err) {
        console.error('Failed to apply zoom:', err)
      }
    }
  }, [supportsZoom])

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
    trackRef.current = null
    setIsScanning(false)
    setZoom(1)
    setSupportsZoom(false)
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

      // Get the video track to check zoom capability
      const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream
        const track = stream.getVideoTracks()[0]
        trackRef.current = track
        
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number } }
        if (capabilities.zoom) {
          setSupportsZoom(true)
          setMaxZoom(capabilities.zoom.max || 5)
          setZoom(capabilities.zoom.min || 1)
        }
      }

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

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.5, maxZoom)
    applyZoom(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.5, 1)
    applyZoom(newZoom)
  }

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
          <>
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

            {/* Zoom Controls */}
            {supportsZoom && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                  className="p-2 text-white hover:text-primary-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-white text-sm font-medium min-w-[3rem] text-center">
                  {zoom.toFixed(1)}x
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= maxZoom}
                  className="p-2 text-white hover:text-primary-400 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
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
        Position the QR code within the frame.{' '}
        {supportsZoom
          ? 'Use zoom controls for distant QR codes.'
          : 'Move closer if scanning is difficult.'}
      </p>
    </div>
  )
}
