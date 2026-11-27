import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 })
  }

  const { id: examId } = await params
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "اطلاعات ارسالی نامعتبر است." }, { status: 400 })
  }

  if (!isRecord(body) || !isRecord(body.answers)) {
    return NextResponse.json({ error: "ساختار پاسخ‌ها نامعتبر است." }, { status: 400 })
  }

  const exam = await prisma.simpleExam.findUnique({
    where: { id: examId },
    select: { id: true, questionCount: true },
  })
  if (!exam) {
    return NextResponse.json({ error: "آزمون یافت نشد." }, { status: 404 })
  }

  const answers: Record<string, string> = {}
  for (const [questionNumber, option] of Object.entries(body.answers)) {
    const question = Number(questionNumber)
    if (
      !Number.isInteger(question) ||
      question < 1 ||
      question > exam.questionCount ||
      !["A", "B", "C", "D"].includes(String(option))
    ) {
      return NextResponse.json({ error: "یکی از پاسخ‌های ارسالی نامعتبر است." }, { status: 400 })
    }
    answers[String(question)] = String(option)
  }

  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ success: true, saved: true })
  }

  try {
    // JSONB merge is atomic, so simultaneous requests cannot overwrite other answers.
    const updated = await prisma.$executeRaw`
      UPDATE "SimpleExamAttempt" AS attempt
      SET "answersJson" = COALESCE(attempt."answersJson", '{}'::jsonb)
        || CAST(${JSON.stringify(answers)} AS jsonb)
      FROM "SimpleExam" AS exam
      WHERE attempt."examId" = exam."id"
        AND attempt."examId" = ${examId}
        AND attempt."studentId" = ${session.user.id}
        AND attempt."submittedAt" IS NULL
        AND attempt."deadlineAt" IS NOT NULL
        AND (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') < attempt."deadlineAt"
        AND (exam."endAt" IS NULL OR (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') < exam."endAt")
    `

    if (updated === 1) {
      return NextResponse.json({ success: true, saved: true })
    }

    const attempt = await prisma.simpleExamAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: session.user.id,
        },
      },
      select: { submittedAt: true, startedAt: true, deadlineAt: true },
    })

    if (!attempt) {
      return NextResponse.json({ error: "آزمون هنوز آغاز نشده است." }, { status: 409 })
    }
    if (attempt.submittedAt) {
      return NextResponse.json({ error: "پاسخ‌های آزمون قبلاً ثبت نهایی شده‌اند." }, { status: 409 })
    }

    return NextResponse.json({ error: "مهلت آزمون به پایان رسیده است." }, { status: 409 })
  } catch (error) {
    console.error("SIMPLE_EXAM_ANSWER_SAVE_ERROR:", error)
    return NextResponse.json({ error: "ذخیره پاسخ‌ها با خطا مواجه شد." }, { status: 500 })
  }
}
