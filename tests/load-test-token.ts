/**
 * Token-Based Load Testing Script for Edunox
 * 
 * This script tests the SHORT TOKEN system that was fixed.
 * It simulates the REAL flow:
 *   1. Professor generates a short token (stored in database)
 *   2. Students scan QR → resolve token → mark attendance
 * 
 * This tests that ALL 100 students can resolve the SAME token
 * from the database (the bug we just fixed).
 * 
 * Usage:
 *   1. Start your dev server: npm run dev
 *   2. Create an active attendance session as professor
 *   3. Run: npx ts-node tests/load-test-token.ts
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// ============ CONFIGURATION ============
const CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  NUM_STUDENTS: parseInt(process.env.TEST_NUM_STUDENTS || '100', 10),
  BATCH_SIZE: 20,
  TEST_STUDENT_PASSWORD: 'teststudent123',
  MAX_DISTANCE_METERS: 50,
}

const prisma = new PrismaClient()

// ============ TYPES ============
interface TestResult {
  studentEmail: string
  success: boolean
  responseTime: number
  resolveTime?: number
  attendanceTime?: number
  error?: string
  statusCode?: number
  step?: 'resolve' | 'attendance'
}

interface SessionInfo {
  id: string
  latitude: number
  longitude: number
  subjectName: string
}

// ============ HELPERS ============
function generateNearbyLocation(lat: number, lng: number, maxDistanceMeters: number) {
  const metersPerDegree = 111000
  const maxOffset = maxDistanceMeters / metersPerDegree
  
  return {
    lat: lat + (Math.random() - 0.5) * 2 * maxOffset,
    lng: lng + (Math.random() - 0.5) * 2 * maxOffset,
  }
}

// ============ HTTP HELPERS ============
async function loginStudent(email: string): Promise<string | null> {
  try {
    const csrfRes = await fetch(`${CONFIG.BASE_URL}/api/auth/csrf`)
    const csrfData = await csrfRes.json()
    const csrfToken = csrfData.csrfToken
    const csrfCookies = csrfRes.headers.getSetCookie?.() || []
    const cookieHeader = csrfCookies.join('; ')
    
    const loginRes = await fetch(`${CONFIG.BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password: CONFIG.TEST_STUDENT_PASSWORD,
        json: 'true',
      }),
      redirect: 'manual',
    })
    
    const loginCookies = loginRes.headers.getSetCookie?.() || []
    for (const cookie of loginCookies) {
      const match = cookie.match(/next-auth\.session-token=([^;]+)/)
      if (match) return match[1]
    }
    return null
  } catch (error) {
    console.error(`Login failed for ${email}:`, error)
    return null
  }
}

async function loginProfessor(email: string, password: string): Promise<string | null> {
  try {
    const csrfRes = await fetch(`${CONFIG.BASE_URL}/api/auth/csrf`)
    const csrfData = await csrfRes.json()
    const csrfToken = csrfData.csrfToken
    const csrfCookies = csrfRes.headers.getSetCookie?.() || []
    const cookieHeader = csrfCookies.join('; ')
    
    const loginRes = await fetch(`${CONFIG.BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
      },
      body: new URLSearchParams({
        csrfToken,
        email,
        password,
        json: 'true',
      }),
      redirect: 'manual',
    })
    
    const loginCookies = loginRes.headers.getSetCookie?.() || []
    for (const cookie of loginCookies) {
      const match = cookie.match(/next-auth\.session-token=([^;]+)/)
      if (match) return match[1]
    }
    return null
  } catch (error) {
    console.error(`Professor login failed:`, error)
    return null
  }
}

/**
 * Get short token from the QR endpoint (as professor would)
 */
async function getShortToken(professorToken: string, sessionId: string): Promise<string | null> {
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/api/sessions/${sessionId}/qr`, {
      headers: {
        'Cookie': `next-auth.session-token=${professorToken}`,
      },
    })
    
    if (!response.ok) {
      console.error('Failed to get short token:', await response.text())
      return null
    }
    
    const data = await response.json()
    return data.token
  } catch (error) {
    console.error('Error getting short token:', error)
    return null
  }
}

/**
 * Resolve short token to full payload (as student scanner would)
 */
async function resolveToken(
  studentToken: string, 
  shortToken: string
): Promise<{ payload: any; responseTime: number } | null> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/api/qr/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${studentToken}`,
      },
      body: JSON.stringify({ token: shortToken }),
    })
    
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      const error = await response.json()
      return null
    }
    
    const payload = await response.json()
    return { payload, responseTime }
  } catch (error) {
    return null
  }
}

/**
 * Mark attendance with resolved payload
 */
async function markAttendance(
  studentToken: string,
  payload: any,
  location: { lat: number; lng: number }
): Promise<{ success: boolean; responseTime: number; error?: string; statusCode?: number }> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${CONFIG.BASE_URL}/api/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${studentToken}`,
      },
      body: JSON.stringify({
        ...payload,
        studentLatitude: location.lat,
        studentLongitude: location.lng,
      }),
    })
    
    const responseTime = Date.now() - startTime
    const data = await response.json()
    
    return {
      success: response.ok,
      responseTime,
      statusCode: response.status,
      error: response.ok ? undefined : data.error,
    }
  } catch (error: any) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message,
    }
  }
}

/**
 * Full student flow: resolve token → mark attendance
 */
async function studentFlow(
  studentEmail: string,
  studentToken: string,
  shortToken: string,
  sessionInfo: SessionInfo
): Promise<TestResult> {
  const startTime = Date.now()
  
  // Step 1: Resolve the short token
  const resolveResult = await resolveToken(studentToken, shortToken)
  
  if (!resolveResult) {
    return {
      studentEmail,
      success: false,
      responseTime: Date.now() - startTime,
      error: 'Failed to resolve token (token not found in database)',
      step: 'resolve',
    }
  }
  
  // Step 2: Mark attendance
  const location = generateNearbyLocation(
    sessionInfo.latitude,
    sessionInfo.longitude,
    CONFIG.MAX_DISTANCE_METERS
  )
  
  const attendanceResult = await markAttendance(studentToken, resolveResult.payload, location)
  
  return {
    studentEmail,
    success: attendanceResult.success,
    responseTime: Date.now() - startTime,
    resolveTime: resolveResult.responseTime,
    attendanceTime: attendanceResult.responseTime,
    error: attendanceResult.error,
    statusCode: attendanceResult.statusCode,
    step: attendanceResult.success ? undefined : 'attendance',
  }
}

// ============ DATABASE HELPERS ============
async function createTestStudents(count: number): Promise<Array<{ id: string; email: string }>> {
  console.log(`\n📝 Creating ${count} test students...`)
  const students: Array<{ id: string; email: string }> = []
  const passwordHash = await hash(CONFIG.TEST_STUDENT_PASSWORD, 10)
  
  for (let i = 1; i <= count; i++) {
    const email = `teststudent${i}@loadtest.local`
    const fullName = `Test Student ${i}`
    
    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash,
          fullName,
          role: 'student',
        },
      })
      students.push({ id: user.id, email })
      
      if (i % 20 === 0) {
        process.stdout.write(`  Created ${i}/${count} students\r`)
      }
    } catch (error) {
      console.error(`Failed to create student ${i}:`, error)
    }
  }
  
  console.log(`  ✅ ${students.length} test students ready        `)
  return students
}

async function getActiveSession(): Promise<SessionInfo & { professorEmail: string }> {
  console.log('\n🔍 Finding active attendance session...')
  
  const session = await prisma.attendanceSession.findFirst({
    where: { isActive: true },
    include: {
      professor: {
        include: { user: { select: { fullName: true, email: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
  
  if (!session) {
    throw new Error('No active session found. Please create an attendance session first.')
  }
  
  console.log(`  ✅ Found session: ${session.subjectName}`)
  console.log(`     Professor: ${session.professor.user.fullName}`)
  
  return {
    id: session.id,
    latitude: session.latitude,
    longitude: session.longitude,
    subjectName: session.subjectName,
    professorEmail: session.professor.user.email,
  }
}

async function cleanupTestAttendance(sessionId: string, studentIds: string[]) {
  console.log('\n🧹 Cleaning up previous test attendance records...')
  
  const result = await prisma.attendanceRecord.deleteMany({
    where: {
      sessionId,
      studentId: { in: studentIds },
    },
  })
  
  console.log(`  ✅ Deleted ${result.count} previous test records`)
}

// ============ RESULTS PRINTING ============
function printResults(results: TestResult[], totalTime: number, shortToken: string) {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║              TOKEN RESOLUTION LOAD TEST RESULTS            ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const resolveFailures = failed.filter(r => r.step === 'resolve')
  const attendanceFailures = failed.filter(r => r.step === 'attendance')
  
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b)
  const resolveTimes = results.filter(r => r.resolveTime).map(r => r.resolveTime!).sort((a, b) => a - b)
  
  console.log(`\n🔑 Token Info:`)
  console.log(`   Short token tested: ${shortToken}`)
  console.log(`   All ${results.length} students attempted to resolve the SAME token`)
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total students:     ${results.length}`)
  console.log(`   ✅ Successful:      ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`)
  console.log(`   ❌ Failed:          ${failed.length} (${((failed.length / results.length) * 100).toFixed(1)}%)`)
  
  if (failed.length > 0) {
    console.log(`      • Token resolve failures: ${resolveFailures.length}`)
    console.log(`      • Attendance failures:    ${attendanceFailures.length}`)
  }
  
  console.log(`   Total time:         ${totalTime}ms`)
  console.log(`   Throughput:         ${((results.length / totalTime) * 1000).toFixed(1)} req/sec`)
  
  if (resolveTimes.length > 0) {
    const avgResolve = resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length
    console.log(`\n⏱️  Token Resolution Times:`)
    console.log(`   Min:                ${Math.min(...resolveTimes)}ms`)
    console.log(`   Max:                ${Math.max(...resolveTimes)}ms`)
    console.log(`   Average:            ${avgResolve.toFixed(1)}ms`)
  }
  
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]
  
  console.log(`\n⏱️  Total Response Times (resolve + attendance):`)
  console.log(`   Min:                ${Math.min(...responseTimes)}ms`)
  console.log(`   Max:                ${Math.max(...responseTimes)}ms`)
  console.log(`   Average:            ${avg.toFixed(1)}ms`)
  console.log(`   Median (p50):       ${p50}ms`)
  console.log(`   p95:                ${p95}ms`)
  console.log(`   p99:                ${p99}ms`)
  
  if (failed.length > 0) {
    console.log(`\n❌ Failure Details:`)
    const errorGroups: Record<string, number> = {}
    failed.forEach(f => {
      const error = `[${f.step}] ${f.error || `HTTP ${f.statusCode}`}`
      errorGroups[error] = (errorGroups[error] || 0) + 1
    })
    Object.entries(errorGroups).forEach(([error, count]) => {
      console.log(`   • ${error}: ${count}`)
    })
  }
  
  // Verdict
  console.log('\n════════════════════════════════════════════════════════════')
  if (resolveFailures.length === 0) {
    console.log('✅ TOKEN RESOLUTION TEST PASSED!')
    console.log('   All students successfully resolved the token from the database.')
    console.log('   The serverless token storage fix is working correctly.')
  } else {
    console.log('❌ TOKEN RESOLUTION TEST FAILED!')
    console.log(`   ${resolveFailures.length} students could not resolve the token.`)
    console.log('   This indicates the old in-memory storage bug still exists.')
  }
  console.log('════════════════════════════════════════════════════════════')
}

// ============ MAIN ============
async function runTokenLoadTest() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║         EDUNOX TOKEN RESOLUTION LOAD TEST                  ║')
  console.log('║                                                            ║')
  console.log('║  Tests that ALL students can resolve the SAME short token  ║')
  console.log('║  from the database (validates the serverless fix)          ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\nConfiguration:`)
  console.log(`  • Number of students: ${CONFIG.NUM_STUDENTS}`)
  console.log(`  • Base URL: ${CONFIG.BASE_URL}`)
  
  try {
    // Step 1: Get active session
    const sessionInfo = await getActiveSession()
    
    // Step 2: Create test students
    const students = await createTestStudents(CONFIG.NUM_STUDENTS)
    
    // Step 3: Clean up previous records
    await cleanupTestAttendance(sessionInfo.id, students.map(s => s.id))
    
    // Step 4: Login professor and get short token
    console.log('\n🔐 Logging in professor to get short token...')
    
    // For testing, we need professor credentials - use a known test professor or prompt
    const professorPassword = process.env.TEST_PROFESSOR_PASSWORD || 'testprof123'
    const professorToken = await loginProfessor(sessionInfo.professorEmail, professorPassword)
    
    if (!professorToken) {
      console.log('   ⚠️  Could not login as professor. Using direct database token generation.')
      // Fallback: generate token directly via database
    }
    
    // Get short token (this stores it in database)
    console.log('   Generating short token...')
    let shortToken: string | null = null
    
    if (professorToken) {
      shortToken = await getShortToken(professorToken, sessionInfo.id)
    }
    
    if (!shortToken) {
      // Fallback: create token directly in database for testing
      console.log('   Using direct database token creation...')
      const crypto = await import('crypto')
      shortToken = crypto.randomBytes(6).toString('base64url')
      
      const session = await prisma.attendanceSession.findUnique({
        where: { id: sessionInfo.id },
      })
      
      if (!session) throw new Error('Session not found')
      
      const timestamp = Date.now()
      const nonce = crypto.randomBytes(16).toString('hex').slice(0, 16)
      const data = `${sessionInfo.id}:${timestamp}:${nonce}`
      const signature = crypto.createHmac('sha256', session.sessionSecret).update(data).digest('hex')
      
      await prisma.qRToken.create({
        data: {
          token: shortToken,
          sessionId: sessionInfo.id,
          timestamp: BigInt(timestamp),
          nonce,
          signature,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      })
    }
    
    console.log(`   ✅ Short token: ${shortToken}`)
    
    // Step 5: Login all students
    console.log('\n🔐 Logging in students...')
    const studentTokens: Array<{ email: string; token: string }> = []
    
    for (let i = 0; i < students.length; i += CONFIG.BATCH_SIZE) {
      const batch = students.slice(i, i + CONFIG.BATCH_SIZE)
      const loginPromises = batch.map(async (s) => {
        const token = await loginStudent(s.email)
        return { email: s.email, token }
      })
      
      const results = await Promise.all(loginPromises)
      results.forEach(r => {
        if (r.token) {
          studentTokens.push({ email: r.email, token: r.token })
        }
      })
      
      process.stdout.write(`  Logged in ${Math.min(i + CONFIG.BATCH_SIZE, students.length)}/${students.length} students\r`)
    }
    
    console.log(`\n  ✅ ${studentTokens.length} students logged in`)
    
    if (studentTokens.length === 0) {
      throw new Error('No students could log in. Check if the server is running.')
    }
    
    // Step 6: ALL students resolve the SAME token and mark attendance CONCURRENTLY
    console.log('\n🚀 Starting concurrent token resolution test...')
    console.log(`   All ${studentTokens.length} students will try to resolve token: ${shortToken}`)
    console.log('   This simulates the real-world scenario that was previously failing.\n')
    
    const startTime = Date.now()
    
    // Execute ALL student flows concurrently
    const promises = studentTokens.map(s =>
      studentFlow(s.email, s.token, shortToken!, sessionInfo)
    )
    
    const results = await Promise.all(promises)
    const totalTime = Date.now() - startTime
    
    // Step 7: Print results
    printResults(results, totalTime, shortToken!)
    
    // Verify in database
    const dbCount = await prisma.attendanceRecord.count({
      where: {
        sessionId: sessionInfo.id,
        studentId: { in: students.map(s => s.id) },
      },
    })
    
    console.log(`\n✅ Database Verification:`)
    console.log(`   Attendance records created: ${dbCount}/${students.length}`)
    
  } catch (error) {
    console.error('\n❌ Load test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
runTokenLoadTest()

