import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Prisma } from "@prisma/client"

const optionLabels: Record<string, string> = { A: "الف", B: "ب", C: "ج", D: "د" }

function toAnswerMap(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
}

function formatDate(value: Date | null) {
  if (!value) return "ثبت نشده"
  return new Date(value).toLocaleString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export default async function CounselorExamSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COUNSELOR") redirect("/login")

  const { id } = await params
  const assignedProfiles = await prisma.studentProfile.findMany({
    where: { counselorId: session.user.id }, select: { userId: true },
  })
  const assignedStudentIds = assignedProfiles.map((profile) => profile.userId)

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
        where: { studentId: { in: assignedStudentIds }, submittedAt: { not: null } },
        orderBy: [{ percentage: "desc" }, { submittedAt: "asc" }],
      },
    },
  })
  if (!exam) notFound()

  const students = await prisma.user.findMany({
    where: { id: { in: assignedStudentIds } }, select: { id: true, fullName: true },
  })
  const studentMap = new Map(students.map((student) => [student.id, student.fullName]))
  const answerKey = toAnswerMap(exam.answerKeyJson)
  const total = exam.attempts.length
  const average = total ? exam.attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / total : 0
  const highest = total ? Math.max(...exam.attempts.map((attempt) => attempt.percentage)) : 0

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">نتایج آزمون</h1><p className="mt-2 text-muted-foreground">{exam.title}</p><p className="mt-1 text-xs text-muted-foreground">فقط نتایج دانش‌آموزان اختصاص‌یافته به شما نمایش داده می‌شود.</p></div>
        <Link href="/counselor/simple-exams" className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-bold hover:bg-muted">بازگشت به آزمون‌ها</Link>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="شرکت‌کنندگان من" value={total} /><Metric label="میانگین درصد" value={`${average.toFixed(2)}%`} /><Metric label="بالاترین درصد" value={`${highest}%`} />
      </section>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">هنوز هیچ‌یک از دانش‌آموزان اختصاص‌یافته به شما آزمون را ثبت نهایی نکرده‌اند.</div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-right text-sm">
            <thead className="bg-muted"><tr><th className="px-4 py-3">رتبه</th><th className="px-4 py-3">دانش‌آموز</th><th className="px-4 py-3">صحیح</th><th className="px-4 py-3">غلط</th><th className="px-4 py-3">بدون پاسخ</th><th className="px-4 py-3">درصد</th><th className="px-4 py-3">زمان ثبت</th></tr></thead>
            <tbody className="divide-y divide-border">{exam.attempts.map((attempt, index) => <tr key={attempt.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-bold">{index + 1}</td><td className="px-4 py-3 font-medium">{studentMap.get(attempt.studentId) || "نامشخص"}</td><td className="px-4 py-3 text-green-600">{attempt.correctCount}</td><td className="px-4 py-3 text-red-600">{attempt.incorrectCount}</td><td className="px-4 py-3">{attempt.unansweredCount}</td><td className="px-4 py-3 font-bold text-primary">{attempt.percentage}%</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(attempt.submittedAt)}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}

      {exam.attempts.length > 0 && <section className="space-y-4">
        <h2 className="text-xl font-bold">بررسی پاسخ‌ها</h2>
        {exam.attempts.map((attempt, index) => {
          const answers = toAnswerMap(attempt.answersJson)
          const studentName = studentMap.get(attempt.studentId) || "دانش‌آموز"
          return <details key={attempt.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            <summary className="cursor-pointer list-none p-4 hover:bg-muted/30"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{index + 1}. {studentName}</span><span className="font-bold text-primary">{attempt.percentage}%</span></div></summary>
            <div className="overflow-x-auto border-t border-border p-4"><table className="w-full min-w-[420px] text-right text-sm">
              <thead className="bg-muted"><tr><th className="px-3 py-2">سوال</th><th className="px-3 py-2">پاسخ دانش‌آموز</th><th className="px-3 py-2">پاسخ صحیح</th><th className="px-3 py-2">نتیجه</th></tr></thead>
              <tbody className="divide-y divide-border">{Array.from({ length: exam.questionCount }, (_, i) => {
                const number = String(i + 1)
                const selected = answers[number]
                const correct = answerKey[number]
                const isCorrect = Boolean(selected) && selected === correct
                return <tr key={number}><td className="px-3 py-2 font-bold">{number}</td><td className="px-3 py-2">{selected ? `${optionLabels[selected] || selected} (${selected})` : "بدون پاسخ"}</td><td className="px-3 py-2 text-green-600">{correct ? `${optionLabels[correct] || correct} (${correct})` : "ثبت نشده"}</td><td className={`px-3 py-2 font-medium ${!selected ? "text-muted-foreground" : isCorrect ? "text-green-600" : "text-red-600"}`}>{!selected ? "بدون پاسخ" : isCorrect ? "صحیح" : "غلط"}</td></tr>
              })}</tbody>
            </table><p className="mt-3 text-xs text-muted-foreground">زمان ثبت: {formatDate(attempt.submittedAt)}</p></div>
          </details>
        })}
      </section>}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold text-primary">{value}</p></div>
}
