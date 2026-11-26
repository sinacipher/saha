/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.chat.count(),
    prisma.message.count(),
    prisma.question.count(),
    prisma.assessment.count(),
    prisma.examAttempt.count(),
    prisma.assessmentResult.count(),
    prisma.importBatch.count()
  ])

  console.log(JSON.stringify({
    users: counts[0],
    chats: counts[1],
    messages: counts[2],
    questions: counts[3],
    assessments: counts[4],
    attempts: counts[5],
    results: counts[6],
    imports: counts[7]
  }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
