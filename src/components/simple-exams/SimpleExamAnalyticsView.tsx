import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Prisma } from "@prisma/client"

type ViewerRole = "ADMIN" | "COUNSELOR"

export default async function SimpleExamAnalyticsView({
  examId,
  viewerRole,
  viewerId,
  backHref,
}: {
  examId: string
  viewerRole: ViewerRole
  viewerId: string
  backHref: string
}) {
  const exam = await prisma.simpleExam.findUnique({
    where: { id: examId },
    select: {
      id: true,
      title: true,
      instructions: true,
      description: true,
      questionCount: true,
    },
  })

  if (!exam) notFound()

  let assignedStudentIds: string[] | null = null
  if (viewerRole === "COUNSELOR") {
    const profiles = await prisma.studentProfile.findMany({
      where: { counselorId: viewerId },
      select: { userId: true },
    })
    assignedStudentIds = profiles.map((profile) => profile.userId)
  }

  const where: Prisma.SimpleExamAttemptWhereInput = {
    examId,
    ...(assignedStudentIds ? { studentId: { in: assignedStudentIds } } : {}),
  }
  const attempts = await prisma.simpleExamAttempt.findMany({
    where,
    orderBy: [{ percentage: "desc" }, { submittedAt: "asc" }],
  })

  const studentIds = [...new Set(attempts.map((attempt) => attempt.studentId))]
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true },
  })
  const studentNames = new Map(students.map((student) => [student.id, student.fullName]))

  const count = attempts.length
  const average = count
    ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / count
    : 0
  const highest = count ? Math.max(...attempts.map((attempt) => attempt.percentage)) : 0
  const lowest = count ? Math.min(...attempts.map((attempt) => attempt.percentage)) : 0

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">آمار آزمون: {exam.title}</h1>
          {(exam.instructions || exam.description) && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-7 text-muted-foreground">
              {exam.instructions || exam.description}
            </p>
          )}
        </div>
        <Link
          href={backHref}
          className="rounded-xl border border-border px-4 py-2 text-center text-sm font-bold transition hover:bg-muted"
        >
          بازگشت به آزمون‌ها
        </Link>
      </header>

      {viewerRole === "COUNSELOR" && (
        <p className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-sm leading-6 text-blue-700 dark:text-blue-300">
          آمار این صفحه فقط بر اساس دانش‌آموزان متصل به حساب مشاور محاسبه شده است.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="تعداد شرکت‌کنندگان" value={`${count} نفر`} />
        <Metric label="میانگین درصد" value={`${average.toFixed(2)}%`} color="text-blue-600" />
        <Metric label="بالاترین درصد" value={`${highest}%`} color="text-green-600" />
        <Metric label="پایین‌ترین درصد" value={`${lowest}%`} color="text-red-600" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">رتبه‌بندی دانش‌آموزان</h2>
        </div>
        {attempts.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            {viewerRole === "COUNSELOR"
              ? "هنوز هیچ‌یک از دانش‌آموزان متصل به شما در این آزمون شرکت نکرده‌اند."
              : "هنوز هیچ دانش‌آموزی در این آزمون شرکت نکرده است."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-right text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3">رتبه</th>
                  <th className="px-4 py-3">نام دانش‌آموز</th>
                  <th className="px-4 py-3">درصد</th>
                  <th className="px-4 py-3">صحیح</th>
                  <th className="px-4 py-3">غلط</th>
                  <th className="px-4 py-3">زمان ثبت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attempts.map((attempt, index) => (
                  <tr key={attempt.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-bold">{index + 1}</td>
                    <td className="px-4 py-3">{studentNames.get(attempt.studentId) || "ناشناس"}</td>
                    <td className="px-4 py-3 font-bold text-primary">{attempt.percentage}%</td>
                    <td className="px-4 py-3 text-green-600">{attempt.correctCount}</td>
                    <td className="px-4 py-3 text-red-600">{attempt.incorrectCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(attempt.submittedAt).toLocaleDateString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  color = "text-foreground",
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
