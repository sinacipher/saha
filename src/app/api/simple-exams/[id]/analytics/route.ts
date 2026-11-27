import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 })
  }

  const { id } = await params
  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    select: { id: true, title: true, instructions: true, description: true },
  })

  if (!exam) {
    return NextResponse.json({ error: "آزمون یافت نشد." }, { status: 404 })
  }

  let assignedStudentIds: string[] | null = null
  if (session.user.role === "COUNSELOR") {
    const profiles = await prisma.studentProfile.findMany({
      where: { counselorId: session.user.id },
      select: { userId: true },
    })
    assignedStudentIds = profiles.map((profile) => profile.userId)
  }

  const where: Prisma.SimpleExamAttemptWhereInput = {
    examId: id,
    ...(assignedStudentIds ? { studentId: { in: assignedStudentIds } } : {}),
  }

  const attempts = await prisma.simpleExamAttempt.findMany({
    where,
    orderBy: { percentage: "desc" },
  })
  const studentIds = [...new Set(attempts.map((attempt) => attempt.studentId))]
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true },
  })
  const nameMap = new Map(users.map((user) => [user.id, user.fullName]))

  const percentages = attempts.map((attempt) => attempt.percentage)
  const totalAttempts = attempts.length
  const averagePercentage = totalAttempts
    ? percentages.reduce((sum, value) => sum + value, 0) / totalAttempts
    : 0

  return NextResponse.json({
    examTitle: exam.title,
    instructions: exam.instructions || exam.description,
    totalAttempts,
    averagePercentage: Math.round(averagePercentage * 100) / 100,
    highestPercentage: totalAttempts ? Math.max(...percentages) : 0,
    lowestPercentage: totalAttempts ? Math.min(...percentages) : 0,
    studentsList: attempts.map((attempt) => ({
      studentId: attempt.studentId,
      studentName: nameMap.get(attempt.studentId) || "ناشناس",
      percentage: attempt.percentage,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      submittedAt: attempt.submittedAt,
    })),
  })
}
