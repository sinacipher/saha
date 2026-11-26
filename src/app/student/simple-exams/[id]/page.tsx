import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import ExamUI from "./ExamUI"

export default async function TakeExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: { attempts: { where: { studentId: session.user.id } } }
  })

  if (!exam) notFound()
  if (exam.attempts.length > 0) {
    return <div className="p-10 text-center font-bold text-red-600">شما قبلاً در این آزمون شرکت کرده‌اید.</div>
  }

  const now = new Date()
  
  // If exam hasn't started, prevent access
  if (exam.startAt && now < exam.startAt) {
    return <div className="p-10 text-center text-red-600 font-bold">آزمون هنوز شروع نشده است.</div>
  }
  
  // If exam has ended, prevent access
  if (exam.endAt && now > exam.endAt) {
    return <div className="p-10 text-center text-red-600 font-bold">مهلت این آزمون به پایان رسیده است.</div>
  }

  // Calculate ACTUAL remaining time for this student
  // (Duration in minutes vs. time left until endAt)
  const durationMs = exam.durationMinutes * 60 * 1000
  const examEndMs = exam.endAt ? exam.endAt.getTime() - now.getTime() : Infinity
  const actualTimeLeftMs = Math.min(durationMs, examEndMs)
  const actualMinutesLeft = Math.max(1, Math.floor(actualTimeLeftMs / 60000))

  const examData = {
    id: exam.id,
    title: exam.title,
    questionCount: exam.questionCount,
    durationMinutes: actualMinutesLeft, // 👈 Passing the actual allowed time, not the configured time
  }

  return <ExamUI params={await params} exam={examData} />
}