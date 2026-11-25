import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const studentAnswers = body.answers as Record<string, string> // {"1": "A", "2": "B"}

  const exam = await prisma.simpleExam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 })

  // بررسی تکراری نبودن شرکت در آزمون
  const existingAttempt = await prisma.simpleExamAttempt.findUnique({
    where: { examId_studentId: { examId: id, studentId: session.user.id } }
  })
  if (existingAttempt) return NextResponse.json({ error: "شما قبلاً در این آزمون شرکت کرده‌اید" }, { status: 400 })

  const answerKey = exam.answerKeyJson as Record<string, string>
  
  let correctCount = 0
  let incorrectCount = 0
  let unansweredCount = 0

  // محاسبه نمره بر اساس فرمول کنکور
  for (let i = 1; i <= exam.questionCount; i++) {
    const studentAns = studentAnswers[i.toString()]
    const correctAns = answerKey[i.toString()]

    if (!studentAns) {
      unansweredCount++
    } else if (studentAns === correctAns) {
      correctCount++
    } else {
      incorrectCount++
    }
  }

  const rawScore = (correctCount * 3) - (incorrectCount * 1)
  const maxPossibleScore = exam.questionCount * 3
  const percentage = Math.max(0, (rawScore / maxPossibleScore) * 100)

  const attempt = await prisma.simpleExamAttempt.create({
    data: {
      examId: id,
      studentId: session.user.id,
      answersJson: studentAnswers,
      correctCount,
      incorrectCount,
      unansweredCount,
      rawScore,
      percentage: Math.round(percentage * 100) / 100
    }
  })

  return NextResponse.json({ success: true, attemptId: attempt.id, percentage: attempt.percentage })
}