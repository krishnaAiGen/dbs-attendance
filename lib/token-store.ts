import crypto from 'crypto'

/**
 * Short Token Store for QR Codes
 * 
 * Uses global variable to persist across Next.js hot reloads
 * In production, consider using Redis for multi-instance support
 */

interface StoredToken {
  sessionId: string
  timestamp: number
  nonce: string
  signature: string
  createdAt: number
}

// Token validity in milliseconds (5 minutes)
const TOKEN_VALIDITY_MS = 5 * 60 * 1000

// Use global to persist across hot reloads in development
const globalForTokens = globalThis as unknown as {
  tokenStore: Map<string, StoredToken> | undefined
}

// Initialize or reuse existing store
const tokenStore = globalForTokens.tokenStore ?? new Map<string, StoredToken>()

// Save to global in development
if (process.env.NODE_ENV !== 'production') {
  globalForTokens.tokenStore = tokenStore
}

// Clean up expired tokens every minute
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [token, data] of tokenStore.entries()) {
      if (now - data.createdAt > TOKEN_VALIDITY_MS) {
        tokenStore.delete(token)
      }
    }
  }, 60 * 1000)
}

/**
 * Generate a short, URL-safe token (8 characters)
 */
export function generateShortToken(): string {
  return crypto.randomBytes(6).toString('base64url')
}

/**
 * Store QR payload and return a short token
 */
export function storeQRPayload(payload: {
  sessionId: string
  timestamp: number
  nonce: string
  signature: string
}): string {
  const token = generateShortToken()
  
  tokenStore.set(token, {
    ...payload,
    createdAt: Date.now(),
  })
  
  console.log(`[TokenStore] Stored token: ${token} for session: ${payload.sessionId}`)
  console.log(`[TokenStore] Total tokens stored: ${tokenStore.size}`)
  
  return token
}

/**
 * Retrieve QR payload from short token
 */
export function getQRPayload(token: string): StoredToken | null {
  console.log(`[TokenStore] Looking up token: ${token}`)
  console.log(`[TokenStore] Total tokens in store: ${tokenStore.size}`)
  
  const data = tokenStore.get(token)
  
  if (!data) {
    console.log(`[TokenStore] Token not found: ${token}`)
    return null
  }
  
  // Check if token is expired
  if (Date.now() - data.createdAt > TOKEN_VALIDITY_MS) {
    console.log(`[TokenStore] Token expired: ${token}`)
    tokenStore.delete(token)
    return null
  }
  
  console.log(`[TokenStore] Token valid: ${token}`)
  return data
}

/**
 * Invalidate a token
 */
export function invalidateToken(token: string): void {
  tokenStore.delete(token)
}
