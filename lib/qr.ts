import crypto from 'crypto'

export interface QRPayload {
  sessionId: string
  timestamp: number
  nonce: string
  signature: string
}

/**
 * QR validity duration in milliseconds (default: 5 minutes)
 */
export const QR_VALIDITY_MS = (parseInt(process.env.QR_VALIDITY_SECONDS || '300', 10)) * 1000

/**
 * Generate a random nonce for QR payload
 */
function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length)
}

/**
 * Generate HMAC-SHA256 signature for QR payload
 */
function generateSignature(
  sessionId: string,
  timestamp: number,
  nonce: string,
  secret: string
): string {
  const data = `${sessionId}:${timestamp}:${nonce}`
  return crypto.createHmac('sha256', secret).update(data).digest('hex')
}

/**
 * Generate a QR payload with HMAC signature
 */
export function generateQRPayload(
  sessionId: string,
  sessionSecret: string
): QRPayload {
  const timestamp = Date.now()
  const nonce = generateNonce()
  const signature = generateSignature(sessionId, timestamp, nonce, sessionSecret)

  return {
    sessionId,
    timestamp,
    nonce,
    signature,
  }
}

/**
 * Verify a QR payload signature
 */
export function verifyQRPayload(
  payload: QRPayload,
  sessionSecret: string
): boolean {
  const expectedSignature = generateSignature(
    payload.sessionId,
    payload.timestamp,
    payload.nonce,
    sessionSecret
  )

  return crypto.timingSafeEqual(
    Buffer.from(payload.signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Check if a QR payload timestamp is within the valid window
 * Default: uses QR_VALIDITY_MS from environment (5 minutes)
 */
export function isPayloadTimestampValid(
  timestamp: number,
  maxAgeMs: number = QR_VALIDITY_MS
): boolean {
  const now = Date.now()
  return now - timestamp < maxAgeMs
}

/**
 * Generate a session secret for signing QR payloads
 */
export function generateSessionSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Parse QR payload from JSON string
 */
export function parseQRPayload(data: string): QRPayload | null {
  try {
    const parsed = JSON.parse(data)
    if (
      typeof parsed.sessionId === 'string' &&
      typeof parsed.timestamp === 'number' &&
      typeof parsed.nonce === 'string' &&
      typeof parsed.signature === 'string'
    ) {
      return parsed as QRPayload
    }
    return null
  } catch {
    return null
  }
}

