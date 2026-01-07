import crypto from 'crypto'
import { prisma } from './prisma'

/**
 * Short Token Store for QR Codes
 * 
 * Uses PostgreSQL database to persist tokens across serverless instances.
 * This ensures all serverless function instances can access the same tokens.
 */

interface QRPayload {
  sessionId: string
  timestamp: number
  nonce: string
  signature: string
}

// Token validity in milliseconds (5 minutes)
const TOKEN_VALIDITY_MS = 5 * 60 * 1000

/**
 * Generate a short, URL-safe token (8 characters)
 */
export function generateShortToken(): string {
  return crypto.randomBytes(6).toString('base64url')
}

/**
 * Store QR payload in database and return a short token
 */
export async function storeQRPayload(payload: QRPayload): Promise<string> {
  const token = generateShortToken()
  const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_MS)
  
  try {
    await prisma.qRToken.create({
      data: {
        token,
        sessionId: payload.sessionId,
        timestamp: BigInt(payload.timestamp),
        nonce: payload.nonce,
        signature: payload.signature,
        expiresAt,
      },
    })
    
    console.log(`[TokenStore] Stored token: ${token} for session: ${payload.sessionId}`)
    
    return token
  } catch (error) {
    console.error('[TokenStore] Failed to store token:', error)
    throw error
  }
}

/**
 * Retrieve QR payload from short token (from database)
 */
export async function getQRPayload(token: string): Promise<QRPayload | null> {
  console.log(`[TokenStore] Looking up token: ${token}`)
  
  try {
    const data = await prisma.qRToken.findUnique({
      where: { token },
    })
    
    if (!data) {
      console.log(`[TokenStore] Token not found: ${token}`)
      return null
    }
    
    // Check if token is expired
    if (new Date() > data.expiresAt) {
      console.log(`[TokenStore] Token expired: ${token}`)
      // Clean up expired token
      await prisma.qRToken.delete({ where: { token } }).catch(() => {})
      return null
    }
    
    console.log(`[TokenStore] Token valid: ${token}`)
    
    return {
      sessionId: data.sessionId,
      timestamp: Number(data.timestamp),
      nonce: data.nonce,
      signature: data.signature,
    }
  } catch (error) {
    console.error('[TokenStore] Failed to get token:', error)
    return null
  }
}

/**
 * Invalidate a token
 */
export async function invalidateToken(token: string): Promise<void> {
  try {
    await prisma.qRToken.delete({ where: { token } })
  } catch (error) {
    // Token might not exist, that's fine
  }
}

/**
 * Clean up expired tokens (can be called periodically or by a cron job)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.qRToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
  
  if (result.count > 0) {
    console.log(`[TokenStore] Cleaned up ${result.count} expired tokens`)
  }
  
  return result.count
}
