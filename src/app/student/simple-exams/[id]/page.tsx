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

  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "STUDENT") redirect("/dashboard")

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
        where: { studentId: session.user.id },
        take: 1,
      },
    },
  })

  if (!exam) notFound()

  if (exam.attempts.length > 0) {
    redirect(`/student/simple-exams/${id}/result`)
  }

  const now = new Date()
  if (exam.startAt && now < exam.startAt) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center font-bold text-amber-700">
        آزمون هنوز شروع نشده است.
      </div>
    )
  }

  if (exam.endAt && now >= exam.endAt) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center font-bold text-red-600">
        مهلت این آزمون به پایان رسیده است.
      </div>
    )
  }

  const configuredDurationSeconds = exam.durationMinutes * 60
  const remainingUntilEndSeconds = exam.endAt
    ? Math.max(0, Math.floor((exam.endAt.getTime() - now.getTime()) / 1000))
    : Number.MAX_SAFE_INTEGER
  const durationSeconds = Math.min(configuredDurationSeconds, remainingUntilEndSeconds)

  if (durationSeconds <= 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center font-bold text-red-600">
        مهلت این آزمون به پایان رسیده است.
      </div>
    )
  }

  return (
    <ExamUI
      params={{ id }}
      exam={{
        id: exam.id,
        title: exam.title,
        instructions: exam.instructions || exam.description,
        questionCount: exam.questionCount,
        durationSeconds,
      }}
    />
  )
}
