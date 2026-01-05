/**
 * Load Testing Script for Edunox
 * 
 * Simulates multiple students marking attendance concurrently.
 * 
 * Usage:
 *   1. Set environment variables (or create tests/.env.test)
 *   2. Make sure your dev server is running (npm run dev)
 *   3. Create an active attendance session as professor
 *   4. Run: npx ts-node tests/load-test.ts
 */

import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

// ============ CONFIGURATION ============
const CONFIG = {
  BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  NUM_STUDENTS: parseInt(process.env.TEST_NUM_STUDENTS || '100', 10),
  
  // Professor credentials (to fetch active session)
  PROFESSOR_EMAIL: process.env.TEST_PROFESSOR_EMAIL || '',
  PROFESSOR_PASSWORD: process.env.TEST_PROFESSOR_PASSWORD || '',
  
  // Test student password
  TEST_STUDENT_PASSWORD: 'teststudent123',
  
  // Distance variation in meters (students will be randomly placed within this distance)
  MAX_DISTANCE_METERS: 50,
}

const prisma = new PrismaClient()

// ============ TYPES ============
interface QRPayload {
  sessionId: string
  timestamp: number
  nonce: string
  signature: string
}

interface TestResult {
  studentEmail: string
  success: boolean
  responseTime: number
  error?: string
  statusCode?: number
}

// ============ QR PAYLOAD GENERATION ============
function generateQRPayload(sessionId: string, sessionSecret: string): QRPayload {
  const timestamp = Date.now()
  const nonce = crypto.randomBytes(16).toString('hex').slice(0, 16)
  const data = `${sessionId}:${timestamp}:${nonce}`
  const signature = crypto.createHmac('sha256', sessionSecret).update(data).digest('hex')
  
  return { sessionId, timestamp, nonce, signature }
}

// Generate random location within specified meters of a point
function generateNearbyLocation(lat: number, lng: number, maxDistanceMeters: number) {
  // 1 degree ≈ 111,000 meters at equator
  const metersPerDegree = 111000
  const maxOffset = maxDistanceMeters / metersPerDegree
  
  const latOffset = (Math.random() - 0.5) * 2 * maxOffset
  const lngOffset = (Math.random() - 0.5) * 2 * maxOffset
  
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  }
}

// ============ DATABASE HELPERS ============
async function createTestStudents(count: number): Promise<string[]> {
  console.log(`\n📝 Creating ${count} test students...`)
  const studentIds: string[] = []
  const passwordHash = await hash(CONFIG.TEST_STUDENT_PASSWORD, 10)
  
  for (let i = 1; i <= count; i++) {
    const email = `teststudent${i}@loadtest.local`
    const fullName = `Test Student ${i}`
    
    try {
      // Use upsert to handle existing students
      const user = await prisma.user.upsert({
        where: { email },
        update: {}, // Don't update if exists
        create: {
          email,
          passwordHash,
          fullName,
          role: 'student',
        },
      })
      studentIds.push(user.id)
      
      if (i % 20 === 0) {
        process.stdout.write(`  Created ${i}/${count} students\r`)
      }
    } catch (error) {
      console.error(`Failed to create student ${i}:`, error)
    }
  }
  
  console.log(`  ✅ ${studentIds.length} test students ready`)
  return studentIds
}

async function getActiveSession() {
  console.log('\n🔍 Finding active attendance session...')
  
  const session = await prisma.attendanceSession.findFirst({
    where: { isActive: true },
    include: {
      professor: {
        include: {
          user: { select: { fullName: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })
  
  if (!session) {
    throw new Error('No active session found. Please create an attendance session first.')
  }
  
  console.log(`  ✅ Found session: ${session.subjectName}`)
  console.log(`     Professor: ${session.professor.user.fullName}`)
  console.log(`     Location: (${session.latitude.toFixed(4)}, ${session.longitude.toFixed(4)})`)
  
  return session
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

// ============ ATTENDANCE MARKING (Direct DB) ============
async function markAttendanceDirectDB(
  sessionId: string,
  studentId: string,
  location: { lat: number; lng: number },
  professorLat: number,
  professorLng: number
): Promise<TestResult> {
  const startTime = Date.now()
  const email = `student-${studentId.slice(-6)}`
  
  try {
    // Calculate distance
    const distance = calculateDistance(professorLat, professorLng, location.lat, location.lng)
    
    // Create attendance record
    await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        studentLatitude: location.lat,
        studentLongitude: location.lng,
        distanceMeters: distance,
      },
    })
    
    return {
      studentEmail: email,
      success: true,
      responseTime: Date.now() - startTime,
    }
  } catch (error: any) {
    return {
      studentEmail: email,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.code === 'P2002' ? 'Duplicate entry' : error.message,
    }
  }
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ============ LOAD TEST RUNNER ============
async function runLoadTest() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║              EDUNOX LOAD TEST                               ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log(`\nConfiguration:`)
  console.log(`  • Number of students: ${CONFIG.NUM_STUDENTS}`)
  console.log(`  • Max distance from professor: ${CONFIG.MAX_DISTANCE_METERS}m`)
  console.log(`  • Base URL: ${CONFIG.BASE_URL}`)
  
  try {
    // Step 1: Get active session
    const session = await getActiveSession()
    
    // Step 2: Create test students
    const studentIds = await createTestStudents(CONFIG.NUM_STUDENTS)
    
    // Step 3: Clean up any previous test records
    await cleanupTestAttendance(session.id, studentIds)
    
    // Step 4: Run concurrent attendance marking
    console.log('\n🚀 Starting load test...')
    console.log(`   Simulating ${CONFIG.NUM_STUDENTS} students marking attendance concurrently...\n`)
    
    const startTime = Date.now()
    
    // Create all promises
    const promises = studentIds.map((studentId, index) => {
      const location = generateNearbyLocation(
        session.latitude,
        session.longitude,
        CONFIG.MAX_DISTANCE_METERS
      )
      
      return markAttendanceDirectDB(
        session.id,
        studentId,
        location,
        session.latitude,
        session.longitude
      )
    })
    
    // Execute all concurrently
    const results = await Promise.all(promises)
    
    const totalTime = Date.now() - startTime
    
    // Step 5: Analyze results
    console.log('\n╔════════════════════════════════════════════════════════════╗')
    console.log('║                    RESULTS                                 ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    const responseTimes = results.map(r => r.responseTime)
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    const maxResponseTime = Math.max(...responseTimes)
    const minResponseTime = Math.min(...responseTimes)
    
    // Sort for percentiles
    responseTimes.sort((a, b) => a - b)
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
    console.log(`   Min:                ${minResponseTime}ms`)
    console.log(`   Max:                ${maxResponseTime}ms`)
    console.log(`   Average:            ${avgResponseTime.toFixed(1)}ms`)
    console.log(`   Median (p50):       ${p50}ms`)
    console.log(`   p95:                ${p95}ms`)
    console.log(`   p99:                ${p99}ms`)
    
    if (failed.length > 0) {
      console.log(`\n❌ Failed Requests:`)
      const errorGroups: Record<string, number> = {}
      failed.forEach(f => {
        const error = f.error || 'Unknown error'
        errorGroups[error] = (errorGroups[error] || 0) + 1
      })
      Object.entries(errorGroups).forEach(([error, count]) => {
        console.log(`   • ${error}: ${count}`)
      })
    }
    
    // Verify in database
    const dbCount = await prisma.attendanceRecord.count({
      where: {
        sessionId: session.id,
        studentId: { in: studentIds },
      },
    })
    
    console.log(`\n✅ Database Verification:`)
    console.log(`   Attendance records created: ${dbCount}`)
    
    console.log('\n════════════════════════════════════════════════════════════')
    console.log('Load test completed!')
    
  } catch (error) {
    console.error('\n❌ Load test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// ============ MAIN ============
runLoadTest()

