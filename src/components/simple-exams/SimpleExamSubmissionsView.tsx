import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Prisma } from "@prisma/client"

type ViewerRole = "ADMIN" | "COUNSELOR"

const optionLabels: Record<string, string> = { A: "الف", B: "ب", C: "ج", D: "د" }

function toAnswerMap(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  )
}

function formatDate(date: Date | null) {
  if (!date) return "ثبت نشده"
  return new Date(date).toLocaleString("fa-IR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  })
}

export default async function SimpleExamSubmissionsView({
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
      id: true, title: true, instructions: true, description: true,
      questionCount: true, answerKeyJson: true,
    },
  })
  if (!exam) notFound()

  let assignedStudentIds: string[] | null = null
  if (viewerRole === "COUNSELOR") {
    const profiles = await prisma.studentProfile.findMany({
      where: { counselorId: viewerId }, select: { userId: true },
    })
    assignedStudentIds = profiles.map((profile) => profile.userId)
  }

  const attemptWhere: Prisma.SimpleExamAttemptWhereInput = {
    examId,
    submittedAt: { not: null },
    ...(assignedStudentIds ? { studentId: { in: assignedStudentIds } } : {}),
  }
  const attempts = await prisma.simpleExamAttempt.findMany({
    where: attemptWhere,
    orderBy: [{ percentage: "desc" }, { submittedAt: "asc" }],
  })

  const studentIds = [...new Set(attempts.map((attempt) => attempt.studentId))]
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } }, select: { id: true, fullName: true, nationalId: true },
  })
  const studentMap = new Map(students.map((student) => [student.id, student]))
  const answerKey = toAnswerMap(exam.answerKeyJson)

  const totalAttempts = attempts.length
  const average = totalAttempts ? attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / totalAttempts : 0
  const highest = totalAttempts ? Math.max(...attempts.map((attempt) => attempt.percentage)) : 0
  const lowest = totalAttempts ? Math.min(...attempts.map((attempt) => attempt.percentage)) : 0

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">نتایج و بررسی پاسخ‌ها</h1>
          <p className="mt-2 text-muted-foreground">{exam.title}</p>
          {(exam.instructions || exam.description) && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm leading-7 text-muted-foreground">
              {exam.instructions || exam.description}
            </p>
          )}
        </div>
        <Link href={backHref} className="rounded-xl border border-border px-4 py-2 text-center text-sm font-bold transition hover:bg-muted">بازگشت به آزمون‌ها</Link>
      </header>

      {viewerRole === "COUNSELOR" && (
        <p className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-sm leading-6 text-blue-700 dark:text-blue-300">
          در پنل مشاور، نتایج فقط برای دانش‌آموزانی نمایش داده می‌شود که به حساب شما متصل هستند.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="تعداد شرکت‌کنندگان" value={String(totalAttempts)} />
        <Metric label="میانگین درصد" value={`${average.toFixed(2)}%`} color="text-blue-600" />
        <Metric label="بالاترین درصد" value={`${highest.toFixed(2)}%`} color="text-green-600" />
        <Metric label="پایین‌ترین درصد" value={`${lowest.toFixed(2)}%`} color="text-red-600" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4"><h2 className="font-bold">فهرست کارنامه‌ها</h2></div>
        {attempts.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            {viewerRole === "COUNSELOR" ? "هنوز هیچ‌یک از دانش‌آموزان متصل به شما آزمون را ثبت نهایی نکرده‌اند." : "هنوز هیچ دانش‌آموزی آزمون را ثبت نهایی نکرده است."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-muted"><tr>
                <th className="px-4 py-3">رتبه</th><th className="px-4 py-3">نام دانش‌آموز</th>
                {viewerRole === "ADMIN" && <th className="px-4 py-3">کد ملی</th>}
                <th className="px-4 py-3">صحیح</th><th className="px-4 py-3">غلط</th><th className="px-4 py-3">بدون پاسخ</th>
                <th className="px-4 py-3">نمره خام</th><th className="px-4 py-3">درصد</th><th className="px-4 py-3">زمان ثبت</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {attempts.map((attempt, index) => {
                  const student = studentMap.get(attempt.studentId)
                  return (
                    <tr key={attempt.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-bold">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{student?.fullName || "نامشخص"}</td>
                      {viewerRole === "ADMIN" && <td className="px-4 py-3" dir="ltr">{student?.nationalId || "-"}</td>}
                      <td className="px-4 py-3 text-green-600">{attempt.correctCount}</td>
                      <td className="px-4 py-3 text-red-600">{attempt.incorrectCount}</td>
                      <td className="px-4 py-3">{attempt.unansweredCount}</td>
                      <td className="px-4 py-3">{attempt.rawScore} / {exam.questionCount * 3}</td>
                      <td className="px-4 py-3 font-bold text-primary">{attempt.percentage}%</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(attempt.submittedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {attempts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">بررسی پاسخ هر دانش‌آموز</h2>
          {attempts.map((attempt, index) => {
            const student = studentMap.get(attempt.studentId)
            const studentAnswers = toAnswerMap(attempt.answersJson)
            return (
              <details key={attempt.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <summary className="cursor-pointer list-none p-4 transition hover:bg-muted/40">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-bold">{index + 1}. {student?.fullName || "دانش‌آموز نامشخص"}</span>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="font-bold text-primary">{attempt.percentage}%</span>
                      <span className="text-green-600">صحیح: {attempt.correctCount}</span>
                      <span className="text-red-600">غلط: {attempt.incorrectCount}</span>
                    </div>
                  </div>
                </summary>
                <div className="border-t border-border p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[430px] text-right text-sm">
                      <thead className="bg-muted"><tr><th className="px-3 py-3">سوال</th><th className="px-3 py-3">پاسخ دانش‌آموز</th><th className="px-3 py-3">پاسخ صحیح</th><th className="px-3 py-3">نتیجه</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {Array.from({ length: exam.questionCount }, (_, questionIndex) => {
                          const number = String(questionIndex + 1)
                          const studentAnswer = studentAnswers[number]
                          const correctAnswer = answerKey[number]
                          const correct = Boolean(studentAnswer) && studentAnswer === correctAnswer
                          return (
                            <tr key={number}>
                              <td className="px-3 py-3 font-bold">{number}</td>
                              <td className="px-3 py-3">{studentAnswer ? `${optionLabels[studentAnswer] || studentAnswer} (${studentAnswer})` : "بدون پاسخ"}</td>
                              <td className="px-3 py-3 font-medium text-green-600">{correctAnswer ? `${optionLabels[correctAnswer] || correctAnswer} (${correctAnswer})` : "ثبت نشده"}</td>
                              <td className="px-3 py-3">{!studentAnswer ? <span className="text-muted-foreground">بدون پاسخ</span> : correct ? <span className="font-medium text-green-600">صحیح</span> : <span className="font-medium text-red-600">غلط</span>}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">زمان ثبت پاسخ: {formatDate(attempt.submittedAt)}</p>
                </div>
              </details>
            )
          })}
        </section>
      )}
    </main>
  )
}

function Metric({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p></div>
}
