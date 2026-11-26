import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  
  // 1. Verify Authentication & Role
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id: examId } = await params
  const body = await req.json()
  const studentAnswers = body.answers as Record<string, string>

  // 2. Validate Payload Structure
  if (!studentAnswers || typeof studentAnswers !== "object" || Array.isArray(studentAnswers)) {
    return NextResponse.json({ error: "ساختار پاسخ‌ها نامعتبر است" }, { status: 400 })
  }

  try {
    // 3. Start Transaction for Atomicity (Prevents double submission)
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Check if student already submitted
      const existingAttempt = await tx.simpleExamAttempt.findUnique({
        where: { examId_studentId: { examId, studentId: session.user.id } }
      })
      if (existingAttempt) {
        throw new Error("ALREADY_SUBMITTED")
      }

      // B. Fetch Exam details (Ensure it exists and is published)
      const exam = await tx.simpleExam.findUnique({ where: { id: examId } })
      if (!exam) throw new Error("EXAM_NOT_FOUND")
      
      const now = new Date()
      if (exam.startAt && now < exam.startAt) throw new Error("NOT_STARTED")
      if (exam.endAt && now > exam.endAt) throw new Error("EXPIRED")
      
      const answerKey = exam.answerKeyJson as Record<string, string>

      // C. Validate Answers against the Answer Key
      let correctCount = 0
      let incorrectCount = 0
      let unansweredCount = 0

      for (let i = 1; i <= exam.questionCount; i++) {
        const qNum = i.toString()
        const studentAns = studentAnswers[qNum]
        const correctAns = answerKey[qNum]

        // Reject invalid options (e.g., if someone sends "Z")
        if (studentAns && !["A", "B", "C", "D"].includes(studentAns)) {
          throw new Error("INVALID_OPTION")
        }

        if (!studentAns) {
          unansweredCount++
        } else if (studentAns === correctAns) {
          correctCount++
        } else {
          incorrectCount++
        }
      }

      // D. Calculate Score (Server-side only)
      const rawScore = (correctCount * 3) - (incorrectCount * 1)
      const maxPossibleScore = exam.questionCount * 3
      const percentage = Math.max(0, (rawScore / maxPossibleScore) * 100)
      const roundedPercentage = Math.round(percentage * 100) / 100

      // E. Create the attempt (Atomicly)
      return await tx.simpleExamAttempt.create({
        data: {
          examId,
          studentId: session.user.id,
          answersJson: studentAnswers,
          correctCount,
          incorrectCount,
          unansweredCount,
          rawScore,
          percentage: roundedPercentage
        }
      })
    })

    return NextResponse.json({ 
      success: true, 
      attemptId: result.id, 
      percentage: result.percentage 
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ALREADY_SUBMITTED") return NextResponse.json({ error: "شما قبلاً در این آزمون شرکت کرده‌اید" }, { status: 400 })
      if (error.message === "EXAM_NOT_FOUND") return NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 })
      if (error.message === "NOT_STARTED") return NextResponse.json({ error: "آزمون هنوز شروع نشده است" }, { status: 403 })
      if (error.message === "EXPIRED") return NextResponse.json({ error: "مهلت آزمون به پایان رسیده است" }, { status: 403 })
      if (error.message === "INVALID_OPTION") return NextResponse.json({ error: "گزینه ارسال شده نامعتبر است" }, { status: 400 })
    }
    
    // Handle Prisma unique constraint errors (race conditions)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: "شما قبلاً در این آزمون شرکت کرده‌اید" }, { status: 400 })
    }

    console.error(error)
    return NextResponse.json({ error: "خطای سرور در ثبت آزمون" }, { status: 500 })
  }
}