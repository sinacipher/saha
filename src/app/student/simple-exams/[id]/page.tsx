import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import ExamUI from "./ExamUI"

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard")
  }

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
        where: {
          studentId: session.user.id,
        },
        take: 1,
      },
    },
  })

  if (!exam) notFound()

  if (exam.attempts.length > 0) {
    return (
      <div className="p-10 text-center font-bold text-red-600">
        شما قبلاً در این آزمون شرکت کرده‌اید.
      </div>
    )
  }

  const now = new Date()

  if (exam.startAt && now < exam.startAt) {
    return (
      <div className="p-10 text-center font-bold text-red-600">
        آزمون هنوز شروع نشده است.
      </div>
    )
  }

  if (exam.endAt && now >= exam.endAt) {
    return (
      <div className="p-10 text-center font-bold text-red-600">
        مهلت این آزمون به پایان رسیده است.
      </div>
    )
  }

  const configuredDurationSeconds =
    exam.durationMinutes * 60

  const remainingUntilEndSeconds = exam.endAt
    ? Math.max(
        0,
        Math.floor(
          (exam.endAt.getTime() - now.getTime()) / 1000
        )
      )
    : Number.MAX_SAFE_INTEGER

  const durationSeconds = Math.min(
    configuredDurationSeconds,
    remainingUntilEndSeconds
  )

  if (durationSeconds <= 0) {
    return (
      <div className="p-10 text-center font-bold text-red-600">
        مهلت این آزمون به پایان رسیده است.
      </div>
    )
  }

  const examData = {
    id: exam.id,
    title: exam.title,
    questionCount: exam.questionCount,
    durationSeconds,
  }

  return (
    <ExamUI
      params={{ id }}
      exam={examData}
    />
  )
}