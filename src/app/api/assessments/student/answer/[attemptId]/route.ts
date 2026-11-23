import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { attemptId } = await context.params
  const body = await request.json() as {
    questionId?: string
    optionKey?: string | null
    markedForReview?: boolean
  }

  if (!body.questionId) return NextResponse.json({ error: "شناسه سؤال الزامی است" }, { status: 400 })

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId }
  })
  if (!attempt || attempt.studentId !== session.user.id) {
    return NextResponse.json({ error: "Attempt یافت نشد" }, { status: 404 })
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "این آزمون قابل تغییر نیست" }, { status: 409 })
  }
  if (attempt.expiresAt <= new Date()) {
    await prisma.examAttempt.update({ where: { id: attempt.id }, data: { status: "EXPIRED" } })
    return NextResponse.json({ error: "زمان آزمون تمام شده است" }, { status: 410 })
  }

  const snapshot = attempt.scoringSnapshot as unknown as {
    sections: Array<{ questions: Array<{ id: string; options: Array<{ optionKey: string }> }> }>
  }
  const question = snapshot.sections.flatMap((section) => section.questions).find((item) => item.id === body.questionId)
  if (!question) return NextResponse.json({ error: "سؤال متعلق به این Attempt نیست" }, { status: 403 })

  if (body.optionKey && !question.options.some((option) => option.optionKey === body.optionKey)) {
    return NextResponse.json({ error: "گزینه نامعتبر است" }, { status: 400 })
  }

  await prisma.studentAnswer.upsert({
    where: { attemptId_questionId: { attemptId: attempt.id, questionId: body.questionId } },
    create: {
      attemptId: attempt.id,
      questionId: body.questionId,
      optionKey: body.optionKey || null,
      markedForReview: !!body.markedForReview,
      isSaved: true
    },
    update: {
      optionKey: body.optionKey || null,
      markedForReview: !!body.markedForReview,
      isSaved: true,
      savedAt: new Date()
    }
  })

  await prisma.attemptEvent.create({
    data: {
      attemptId: attempt.id,
      type: "ANSWER_SAVED",
      metadata: { questionId: body.questionId, hasAnswer: !!body.optionKey, markedForReview: !!body.markedForReview }
    }
  })

  return NextResponse.json({ success: true })
}
