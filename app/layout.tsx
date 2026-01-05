import type { Metadata, Viewport } from 'next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Edunox - Smart Attendance System',
  description: 'QR-based attendance management with GPS verification',
  keywords: ['attendance', 'qr code', 'classroom', 'education', 'edunox'],
  authors: [{ name: 'Edunox Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

