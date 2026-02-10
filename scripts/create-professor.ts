import { createInterface } from 'readline'
import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rl = createInterface({ input: process.stdin, output: process.stdout })

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const special = '@#$!'
  let pwd = special[Math.floor(Math.random() * special.length)]
  for (let i = 0; i < 9; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)]
  }
  // Shuffle
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

async function main() {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║     Create Professor Account         ║')
  console.log('╚══════════════════════════════════════╝\n')

  const fullName = await prompt('Professor name   : ')
  const email     = await prompt('Email address    : ')
  const subject   = await prompt('Subject name     : ')

  if (!fullName || !email || !subject) {
    console.error('\n✗ All fields are required.')
    process.exit(1)
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('\n✗ Invalid email address.')
    process.exit(1)
  }

  // Check for duplicate
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error(`\n✗ A user with email "${email}" already exists.`)
    process.exit(1)
  }

  const password = generatePassword()
  const passwordHash = await hash(password, 12)

  await prisma.$transaction(async (tx) => {
    const keyCode = 'PROF-' + randomBytes(4).toString('hex').toUpperCase()

    const professorKey = await tx.professorKey.create({
      data: { keyCode, subjectName: subject, isUsed: true },
    })

    const user = await tx.user.create({
      data: { email, passwordHash, fullName, role: 'professor' },
    })

    await tx.professor.create({
      data: { userId: user.id, professorKeyId: professorKey.id, subjectName: subject },
    })
  })

  console.log('\n╔══════════════════════════════════════╗')
  console.log('║   ✓ Professor account created!       ║')
  console.log('╠══════════════════════════════════════╣')
  console.log(`║  Name    : ${fullName.padEnd(26)}║`)
  console.log(`║  Email   : ${email.padEnd(26)}║`)
  console.log(`║  Password: ${password.padEnd(26)}║`)
  console.log(`║  Subject : ${subject.padEnd(26)}║`)
  console.log('╚══════════════════════════════════════╝')
  console.log('\n⚠  Share these credentials with the professor and ask them to change their password.\n')
}

main()
  .catch((e) => {
    console.error('\n✗ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    rl.close()
    await prisma.$disconnect()
  })
