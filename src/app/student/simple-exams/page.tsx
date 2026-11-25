import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/auth"

export default async function StudentSimpleExamsList() {
  const session = await auth()
  const exams = await prisma.simpleExam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      attempts: { where: { studentId: session?.user?.id } }
    }
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">آزمون‌های من</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {exams.map(exam => {
          const hasAttempted = exam.attempts.length > 0
          return (
            <div key={exam.id} className="border p-4 rounded-xl bg-card flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold">{exam.title}</h2>
                <p className="text-sm text-muted-foreground">{exam.questionCount} سوال - {exam.durationMinutes} دقیقه</p>
              </div>
              {hasAttempted ? (
                <span className="mt-4 block text-center bg-green-100 text-green-700 p-2 rounded-lg">شما در این آزمون شرکت کرده‌اید</span>
              ) : (
                <Link href={`/student/simple-exams/${exam.id}`} className="mt-4 block text-center bg-primary text-white p-2 rounded-lg">
                  شرکت در آزمون
                </Link>
              )}
            </div>
          )
        })}
        {exams.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">هنوز آزمونی ثبت نشده است.</p>}
      </div>
    </div>
  )
}