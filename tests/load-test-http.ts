/**
 * HTTP-Based Load Testing Script for Edunox
 * 
 * This simulates real HTTP requests like actual students would make.
 * More realistic than direct DB testing but requires running server.
 * 
 * Usage:
 *   1. Start your dev server: npm run dev
 *   2. Create an active attendance session as professor
 *   3. Run: npx ts-node tests/load-test-http.ts
 */

import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// ============ CONFIGURATION ============
const CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  NUM_STUDENTS: parseInt(process.env.TEST_NUM_STUDENTS || '100', 10),
  BATCH_SIZE: 20, // Process in batches to avoid overwhelming
  
  // Test student password
  TEST_STUDENT_PASSWORD: 'teststudent123',
  
  // Distance variation in meters
  MAX_DISTANCE_METERS: 50,
}

const prisma = new PrismaClient()

// ============ TYPES ============
interface TestResult {
  studentEmail: string
  success: boolean
  responseTime: number
  error?: string
  statusCode?: number
}

interface SessionInfo {
  id: string
  secret: string
  latitude: number
  longitude: number
  subjectName: string
}

// ============ QR PAYLOAD GENERATION ============
function generateQRPayload(sessionId: string, sessionSecret: string) {
  const timestamp = Date.now()
  const nonce = crypto.randomBytes(16).toString('hex').slice(0, 16)
  const data = `${sessionId}:${timestamp}:${nonce}`
  const signature = crypto.createHmac('sha256', sessionSecret).update(data).digest('hex')
  
  return { sessionId, timestamp, nonce, signature }
}

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
    // Step 1: Get CSRF token
    const csrfRes = await fetch(`${CONFIG.BASE_URL}/api/auth/csrf`, {
      credentials: 'include',
    })
    const csrfData = await csrfRes.json()
    const csrfToken = csrfData.csrfToken
    
    // Extract cookies from csrf response
    const csrfCookies = csrfRes.headers.getSetCookie?.() || []
    const cookieHeader = csrfCookies.join('; ')
    
    // Step 2: Login
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
    
    // Extract session token from response cookies
    const loginCookies = loginRes.headers.getSetCookie?.() || []
    for (const cookie of loginCookies) {
      const match = cookie.match(/next-auth\.session-token=([^;]+)/)
      if (match) {
        return match[1]
      }
    }
    
    return null
  } catch (error) {
    console.error(`Login failed for ${email}:`, error)
    return null
  }
}

async function markAttendanceHTTP(
  sessionToken: string,
  sessionInfo: SessionInfo,
  studentEmail: string
): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    const qrPayload = generateQRPayload(sessionInfo.id, sessionInfo.secret)
    const location = generateNearbyLocation(
      sessionInfo.latitude,
      sessionInfo.longitude,
      CONFIG.MAX_DISTANCE_METERS
    )
    
    const response = await fetch(`${CONFIG.BASE_URL}/api/attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionToken}`,
      },
      body: JSON.stringify({
        ...qrPayload,
        studentLatitude: location.lat,
        studentLongitude: location.lng,
      }),
    })
    
    const responseTime = Date.now() - startTime
    const data = await response.json()
    
    return {
      studentEmail,
      success: response.ok,
      responseTime,
      statusCode: response.status,
      error: response.ok ? undefined : data.error,
    }
  } catch (error: any) {
    return {
      studentEmail,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message,
    }
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

async function getActiveSession(): Promise<SessionInfo> {
  console.log('\n🔍 Finding active attendance session...')
  
  const session = await prisma.attendanceSession.findFirst({
    where: { isActive: true },
    include: {
      professor: {
        include: { user: { select: { fullName: true } } }
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
    secret: session.sessionSecret,
    latitude: session.latitude,
    longitude: session.longitude,
    subjectName: session.subjectName,
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

// ============ LOAD TEST RUNNER ============
async function runHTTPLoadTest() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║            EDUNOX HTTP LOAD TEST                           ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\nConfiguration:`)
  console.log(`  • Number of students: ${CONFIG.NUM_STUDENTS}`)
  console.log(`  • Batch size: ${CONFIG.BATCH_SIZE}`)
  console.log(`  • Base URL: ${CONFIG.BASE_URL}`)
  
  try {
    // Step 1: Get active session
    const sessionInfo = await getActiveSession()
    
    // Step 2: Create test students
    const students = await createTestStudents(CONFIG.NUM_STUDENTS)
    
    // Step 3: Clean up previous records
    await cleanupTestAttendance(sessionInfo.id, students.map(s => s.id))
    
    // Step 4: Login all students and get tokens
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
    
    // Step 5: Run concurrent attendance marking
    console.log('\n🚀 Starting load test...')
    console.log(`   Simulating ${studentTokens.length} students marking attendance...\n`)
    
    const startTime = Date.now()
    
    // Execute all concurrently
    const attendancePromises = studentTokens.map(s =>
      markAttendanceHTTP(s.token, sessionInfo, s.email)
    )
    
    const results = await Promise.all(attendancePromises)
    const totalTime = Date.now() - startTime
    
    // Step 6: Analyze results
    printResults(results, totalTime)
    
    // Verify in database
    const dbCount = await prisma.attendanceRecord.count({
      where: {
        sessionId: sessionInfo.id,
        studentId: { in: students.map(s => s.id) },
      },
    })
    
    console.log(`\n✅ Database Verification:`)
    console.log(`   Attendance records created: ${dbCount}`)
    
  } catch (error) {
    console.error('\n❌ Load test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function printResults(results: TestResult[], totalTime: number) {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║                      RESULTS                               ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b)
  
  const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
  const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]
  const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
  const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]
  
  console.log(`\n📊 Summary:`)
  console.log(`   Total requests:     ${results.length}`)
  console.log(`   Successful:         ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`)
  console.log(`   Failed:             ${failed.length} (${((failed.length / results.length) * 100).toFixed(1)}%)`)
  console.log(`   Total time:         ${totalTime}ms`)
  console.log(`   Throughput:         ${((results.length / totalTime) * 1000).toFixed(1)} req/sec`)
  
  console.log(`\n⏱️  Response Times:`)
  console.log(`   Min:                ${Math.min(...responseTimes)}ms`)
  console.log(`   Max:                ${Math.max(...responseTimes)}ms`)
  console.log(`   Average:            ${avg.toFixed(1)}ms`)
  console.log(`   Median (p50):       ${p50}ms`)
  console.log(`   p95:                ${p95}ms`)
  console.log(`   p99:                ${p99}ms`)
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed Requests:`)
    const errorGroups: Record<string, number> = {}
    failed.forEach(f => {
      const error = f.error || `HTTP ${f.statusCode}`
      errorGroups[error] = (errorGroups[error] || 0) + 1
    })
    Object.entries(errorGroups).forEach(([error, count]) => {
      console.log(`   • ${error}: ${count}`)
    })
  }
  
  console.log('\n════════════════════════════════════════════════════════════')
  console.log('Load test completed!')
}

// ============ MAIN ============
runHTTPLoadTest()

