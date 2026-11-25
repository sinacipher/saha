import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
        include: { 
          // برای دریافت نام دانش‌آموزان، به مدل User نیاز داریم که در مدل Attempt تعریف نکردیم.
          // پس فعلاً از studentId استفاده می‌کنیم و در ادامه اسم‌ها را می‌گیریم.
        },
        orderBy: { percentage: "desc" }
      }
    }
  })

  if (!exam) return NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 })

  const studentIds = exam.attempts.map(a => a.studentId)
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true }
  })
  const nameMap = new Map(users.map(u => [u.id, u.fullName]))

  const attemptsCount = exam.attempts.length
  let averagePercentage = 0
  let highestPercentage = 0
  let lowestPercentage = 0

  if (attemptsCount > 0) {
    const percentages = exam.attempts.map(a => a.percentage)
    averagePercentage = percentages.reduce((a, b) => a + b, 0) / attemptsCount
    highestPercentage = Math.max(...percentages)
    lowestPercentage = Math.min(...percentages)
  }

  const studentsList = exam.attempts.map(attempt => ({
    studentId: attempt.studentId,
    studentName: nameMap.get(attempt.studentId) || "ناشناس",
    percentage: attempt.percentage,
    correctCount: attempt.correctCount,
    incorrectCount: attempt.incorrectCount,
    submittedAt: attempt.submittedAt
  }))

  return NextResponse.json({
    examTitle: exam.title,
    totalAttempts: attemptsCount,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    highestPercentage,
    lowestPercentage,
    studentsList
  })
}