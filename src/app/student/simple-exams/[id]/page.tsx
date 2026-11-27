import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import { finalizeSimpleExamAttempt } from "@/lib/simple-exam-attempt"
import ExamUI from "./ExamUI"
import { Prisma } from "@prisma/client"

function toAnswerMap(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const answers: Record<string, string> = {}
  for (const [key, option] of Object.entries(value)) {
    if (typeof option === "string" && ["A", "B", "C", "D"].includes(option)) {
      answers[key] = option
    }
  }
  return answers
}

export const dynamic = "force-dynamic"

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "STUDENT") redirect("/dashboard")

  const exam = await prisma.simpleExam.findUnique({ where: { id } })
  if (!exam) notFound()

  let attempt = await prisma.simpleExamAttempt.findUnique({
    where: {
      examId_studentId: {
        examId: id,
        studentId: session.user.id,
      },
    },
  })

  const now = new Date()

  if (attempt?.submittedAt) {
    redirect(`/student/simple-exams/${id}/result`)
  }

  if (!attempt && exam.startAt && now < exam.startAt) {
    return <div className="p-10 text-center font-bold text-red-600">آزمون هنوز شروع نشده است.</div>
  }

  if (!attempt && exam.endAt && now >= exam.endAt) {
    return <div className="p-10 text-center font-bold text-red-600">مهلت این آزمون به پایان رسیده است.</div>
  }

  const newAttemptDeadline = new Date(Math.min(
    now.getTime() + Math.max(0, exam.durationMinutes) * 60_000,
    exam.endAt?.getTime() ?? Number.POSITIVE_INFINITY,
  ))

  if (!attempt) {
    // The unique exam/student constraint makes this safe if two tabs open together.
    attempt = await prisma.simpleExamAttempt.upsert({
      where: {
        examId_studentId: {
          examId: id,
          studentId: session.user.id,
        },
      },
      create: {
        examId: id,
        studentId: session.user.id,
        startedAt: now,
        deadlineAt: newAttemptDeadline,
        answersJson: {},
      },
      update: {},
    })
  }

  if (attempt.submittedAt) {
    redirect(`/student/simple-exams/${id}/result`)
  }

  if (!attempt.deadlineAt) {
    const legacyDeadline = new Date(Math.min(
      attempt.startedAt.getTime() + Math.max(0, exam.durationMinutes) * 60_000,
      exam.endAt?.getTime() ?? Number.POSITIVE_INFINITY,
    ))
    attempt = await prisma.simpleExamAttempt.update({
      where: { id: attempt.id },
      data: { deadlineAt: legacyDeadline },
    })
  }

  const deadlineAt = new Date(Math.min(
    attempt.deadlineAt!.getTime(),
    exam.endAt?.getTime() ?? Number.POSITIVE_INFINITY,
  ))
  const serverNow = new Date()

  let initialRemainingMs = Math.max(0, deadlineAt.getTime() - serverNow.getTime())

  if (initialRemainingMs <= 0) {
    const finalization = await finalizeSimpleExamAttempt(id, session.user.id, false)
    if (finalization.status === "SUBMITTED") {
      redirect(`/student/simple-exams/${id}/result`)
    }
    if (finalization.status === "NOT_DUE") {
      initialRemainingMs = Math.max(1, finalization.deadlineAt.getTime() - new Date().getTime())
    }
  }

  return (
    <ExamUI
      params={{ id }}
      exam={{
        id: exam.id,
        title: exam.title,
        instructions: exam.instructions,
        questionCount: exam.questionCount,
        initialRemainingMs,
        initialAnswers: toAnswerMap(attempt.answersJson),
      }}
    />
  )
}
