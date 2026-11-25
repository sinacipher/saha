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
    include: {
      attempts: { where: { studentId: session.user.id } }
    }
  })

  if (!exam) notFound()
  if (exam.attempts.length > 0) {
    return <div className="p-10 text-center font-bold text-red-600">شما قبلاً در این آزمون شرکت کرده‌اید.</div>
  }

  const examData = {
    id: exam.id,
    title: exam.title,
    questionCount: exam.questionCount,
    durationMinutes: exam.durationMinutes,
    fileData: exam.fileData,
    fileName: exam.fileName,
    fileType: exam.fileType
  }

  return <ExamUI params={await params} exam={examData} />
}