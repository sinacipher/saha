import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type SnapshotOption = { optionKey: string; text: string; isCorrect?: boolean }
type SnapshotQuestion = { id: string; text: string; topic: string | null; difficulty: string; subjectId: string | null; chapterId: string | null; options: SnapshotOption[] }

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]]
  }
  return copy
}

export async function GET(request: Request, context: { params: Promise<{ assessmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { assessmentId } = await context.params
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { assessmentId_studentId: { assessmentId, studentId: session.user.id } }
  })
  if (!assignment) return NextResponse.json({ error: "آزمون برای این دانش‌آموز تخصیص داده نشده است" }, { status: 403 })

  const attempt = await prisma.examAttempt.findFirst({
    where: { assessmentId, studentId: session.user.id, status: "IN_PROGRESS" },
    orderBy: { attemptNumber: "desc" },
    include: { answers: true }
  })

  if (!attempt) return NextResponse.json({ error: "Attempt active نیست" }, { status: 404 })

  if (attempt.expiresAt <= new Date()) {
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" }
    })
    return NextResponse.json({ error: "زمان آزمون تمام شده است" }, { status: 410 })
  }

  const snapshot = attempt.scoringSnapshot as unknown as { sections: Array<{ id: string; title: string; durationSeconds: number | null; questions: SnapshotQuestion[] }> }
  const sanitizedSections = snapshot.sections.map((section) => ({
    id: section.id,
    title: section.title,
    durationSeconds: section.durationSeconds,
    questions: section.questions.map((question) => ({
      id: question.id,
      text: question.text,
      topic: question.topic,
      difficulty: question.difficulty,
      subjectId: question.subjectId,
      chapterId: question.chapterId,
      options: question.options.map((option) => ({ optionKey: option.optionKey, text: option.text }))
    }))
  }))

  const answerMap = Object.fromEntries(attempt.answers.map((answer) => [answer.questionId, {
    optionKey: answer.optionKey,
    markedForReview: answer.markedForReview
  }]))

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString()
    },
    sections: sanitizedSections,
    answers: answerMap
  })
}

export async function POST(request: Request, context: { params: Promise<{ assessmentId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { assessmentId } = await context.params
  const assignment = await prisma.assessmentAssignment.findUnique({
    where: { assessmentId_studentId: { assessmentId, studentId: session.user.id } }
  })
  if (!assignment) return NextResponse.json({ error: "آزمون برای این دانش‌آموز تخصیص داده نشده است" }, { status: 403 })

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      sections: {
        orderBy: { position: "asc" },
        include: { questions: { orderBy: { position: "asc" } } }
      },
      scoringRules: true
    }
  })
  if (!assessment) return NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 })
  if (!["READY", "SCHEDULED", "IN_PROGRESS"].includes(assessment.status)) {
    return NextResponse.json({ error: "آزمون هنوز قابل شروع نیست" }, { status: 409 })
  }
  if (assessment.startAt && assessment.startAt > new Date()) {
    return NextResponse.json({ error: "آزمون هنوز شروع نشده است" }, { status: 409 })
  }
  if (assessment.endAt && assessment.endAt < new Date()) {
    return NextResponse.json({ error: "مهلت آزمون تمام شده است" }, { status: 410 })
  }

  const existing = await prisma.examAttempt.findFirst({
    where: { assessmentId, studentId: session.user.id, status: "IN_PROGRESS" },
    orderBy: { attemptNumber: "desc" }
  })
  if (existing) {
    if (existing.expiresAt <= new Date()) {
      await prisma.examAttempt.update({ where: { id: existing.id }, data: { status: "EXPIRED" } })
    } else {
      return NextResponse.json({ success: true, attemptId: existing.id, expiresAt: existing.expiresAt.toISOString() })
    }
  }

  const previousAttempts = await prisma.examAttempt.count({ where: { assessmentId, studentId: session.user.id } })
  if (previousAttempts >= assessment.maxAttempts) {
    return NextResponse.json({ error: "تعداد مجاز تلاش تمام شده است" }, { status: 409 })
  }

  const sections = assessment.sections.map((section) => {
    let items = section.questions.map((item) => ({
      id: item.questionId,
      text: (item.snapshot as unknown as SnapshotQuestion).text,
      topic: (item.snapshot as unknown as SnapshotQuestion).topic || null,
      difficulty: (item.snapshot as unknown as SnapshotQuestion).difficulty || "MEDIUM",
      subjectId: (item.snapshot as unknown as SnapshotQuestion).subjectId || null,
      chapterId: (item.snapshot as unknown as SnapshotQuestion).chapterId || null,
      options: (item.snapshot as unknown as SnapshotQuestion).options
    }))

    if (assessment.randomizeQuestions) items = shuffle(items)
    if (assessment.randomizeOptions) {
      items = items.map((item) => ({ ...item, options: shuffle(item.options) }))
    }

    return {
      id: section.id,
      title: section.title,
      durationSeconds: section.durationSeconds,
      questions: items
    }
  })

  const expiresAt = new Date(Date.now() + assessment.durationSeconds * 1000)
  const attempt = await prisma.examAttempt.create({
    data: {
      assessmentId,
      studentId: session.user.id,
      attemptNumber: previousAttempts + 1,
      expiresAt,
      scoringSnapshot: {
        sections,
        scoringRule: assessment.scoringRules[0] ? {
          correctPoints: assessment.scoringRules[0].correctPoints,
          incorrectPenalty: assessment.scoringRules[0].incorrectPenalty,
          unansweredPoints: assessment.scoringRules[0].unansweredPoints,
          roundingPrecision: assessment.scoringRules[0].roundingPrecision
        } : null
      }
    }
  })

  await prisma.attemptEvent.create({
    data: { attemptId: attempt.id, type: "STARTED", metadata: { assessmentId } }
  })

  return NextResponse.json({ success: true, attemptId: attempt.id, expiresAt: expiresAt.toISOString() })
}
