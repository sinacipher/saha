import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"

const AUTO_SUBMIT_GRACE_MS = 30_000

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "دسترسی غیرمجاز است." },
      { status: 403 }
    )
  }

  const { id: examId } = await params

  let body: {
    answers?: Record<string, string>
    autoSubmit?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "اطلاعات ارسالی نامعتبر است." },
      { status: 400 }
    )
  }

  const studentAnswers = body.answers
  const autoSubmit = body.autoSubmit === true

  if (
    !studentAnswers ||
    typeof studentAnswers !== "object" ||
    Array.isArray(studentAnswers)
  ) {
    return NextResponse.json(
      { error: "ساختار پاسخ‌ها نامعتبر است." },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingAttempt = await tx.simpleExamAttempt.findUnique({
        where: {
          examId_studentId: {
            examId,
            studentId: session.user.id,
          },
        },
      })

      if (existingAttempt) {
        throw new Error("ALREADY_SUBMITTED")
      }

      const exam = await tx.simpleExam.findUnique({
        where: { id: examId },
      })

      if (!exam) {
        throw new Error("EXAM_NOT_FOUND")
      }

      const now = new Date()

      if (exam.startAt && now < exam.startAt) {
        throw new Error("NOT_STARTED")
      }

      if (exam.endAt && now > exam.endAt) {
        const graceDeadline =
          exam.endAt.getTime() + AUTO_SUBMIT_GRACE_MS

        if (!autoSubmit || now.getTime() > graceDeadline) {
          throw new Error("EXPIRED")
        }
      }

      const answerKey =
        exam.answerKeyJson as Record<string, string>

      let correctCount = 0
      let incorrectCount = 0
      let unansweredCount = 0

      const normalizedAnswers: Record<string, string> = {}

      for (let i = 1; i <= exam.questionCount; i++) {
        const questionNumber = String(i)
        const answer = studentAnswers[questionNumber]

        if (
          answer !== undefined &&
          answer !== "" &&
          !["A", "B", "C", "D"].includes(answer)
        ) {
          throw new Error("INVALID_OPTION")
        }

        if (!answer) {
          unansweredCount++
          continue
        }

        normalizedAnswers[questionNumber] = answer

        if (answer === answerKey[questionNumber]) {
          correctCount++
        } else {
          incorrectCount++
        }
      }

      const rawScore =
        correctCount * 3 - incorrectCount

      const maxPossibleScore =
        exam.questionCount * 3

      const percentage = Math.max(
        0,
        Math.round(
          (rawScore / maxPossibleScore) * 10000
        ) / 100
      )

      return tx.simpleExamAttempt.create({
        data: {
          examId,
          studentId: session.user.id,
          answersJson: normalizedAnswers,
          correctCount,
          incorrectCount,
          unansweredCount,
          rawScore,
          percentage,
        },
      })
    })

    return NextResponse.json({
      success: true,
      attemptId: result.id,
      percentage: result.percentage,
      autoSubmitted: autoSubmit,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "ALREADY_SUBMITTED") {
        return NextResponse.json(
          { error: "شما قبلاً در این آزمون شرکت کرده‌اید." },
          { status: 400 }
        )
      }

      if (error.message === "EXAM_NOT_FOUND") {
        return NextResponse.json(
          { error: "آزمون یافت نشد." },
          { status: 404 }
        )
      }

      if (error.message === "NOT_STARTED") {
        return NextResponse.json(
          { error: "آزمون هنوز شروع نشده است." },
          { status: 403 }
        )
      }

      if (error.message === "EXPIRED") {
        return NextResponse.json(
          { error: "مهلت آزمون به پایان رسیده و امکان ثبت پاسخ وجود ندارد." },
          { status: 403 }
        )
      }

      if (error.message === "INVALID_OPTION") {
        return NextResponse.json(
          { error: "یکی از گزینه‌های ارسال‌شده نامعتبر است." },
          { status: 400 }
        )
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "پاسخ‌های شما قبلاً ثبت شده‌اند." },
        { status: 400 }
      )
    }

    console.error("Simple exam submission error:", error)

    return NextResponse.json(
      { error: "خطای سرور هنگام ثبت پاسخ‌های آزمون." },
      { status: 500 }
    )
  }
}