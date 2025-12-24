import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const professorKeys = [
  { keyCode: 'PROF-MATH-001', subjectName: 'Mathematics' },
  { keyCode: 'PROF-PHY-002', subjectName: 'Physics' },
  { keyCode: 'PROF-CHEM-003', subjectName: 'Chemistry' },
  { keyCode: 'PROF-CS-004', subjectName: 'Computer Science' },
  { keyCode: 'PROF-ENG-005', subjectName: 'English' },
]

async function main() {
  console.log('🌱 Seeding database...')

  for (const key of professorKeys) {
    await prisma.professorKey.upsert({
      where: { keyCode: key.keyCode },
      update: {},
      create: {
        keyCode: key.keyCode,
        subjectName: key.subjectName,
        isUsed: false,
      },
    })
    console.log(`✓ Created professor key: ${key.keyCode} → ${key.subjectName}`)
  }

  console.log('✅ Seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

