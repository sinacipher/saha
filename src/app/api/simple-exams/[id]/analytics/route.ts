import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 })
  }

  const { id } = await params
  let allowedStudentIds: string[] | null = null

  if (session.user.role === "COUNSELOR") {
    const profiles = await prisma.studentProfile.findMany({
      where: { counselorId: session.user.id }, select: { userId: true },
    })
    allowedStudentIds = profiles.map((profile) => profile.userId)
  }

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    select: {
      title: true,
      questionCount: true,
      attempts: {
        where: {
          submittedAt: { not: null },
          ...(allowedStudentIds ? { studentId: { in: allowedStudentIds } } : {}),
        },
        orderBy: { percentage: "desc" },
      },
    },
  })

  if (!exam) return NextResponse.json({ error: "آزمون یافت نشد." }, { status: 404 })

  const studentIds = [...new Set(exam.attempts.map((attempt) => attempt.studentId))]
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } }, select: { id: true, fullName: true },
  })
  const nameMap = new Map(users.map((user) => [user.id, user.fullName]))
  const count = exam.attempts.length
  const percentages = exam.attempts.map((attempt) => attempt.percentage)
  const average = count ? percentages.reduce((sum, value) => sum + value, 0) / count : 0

  return NextResponse.json({
    examTitle: exam.title,
    questionCount: exam.questionCount,
    totalAttempts: count,
    averagePercentage: Math.round(average * 100) / 100,
    highestPercentage: count ? Math.max(...percentages) : 0,
    lowestPercentage: count ? Math.min(...percentages) : 0,
    studentsList: exam.attempts.filter((attempt) => attempt.submittedAt).map((attempt) => ({
      studentId: attempt.studentId,
      studentName: nameMap.get(attempt.studentId) || "ناشناس",
      percentage: attempt.percentage,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      submittedAt: attempt.submittedAt,
    })),
  })
}
