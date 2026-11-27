import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ExamAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login")

  const { id } = await params
  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: { orderBy: [{ percentage: "desc" }, { submittedAt: "asc" }] },
    },
  })
  if (!exam) notFound()

  const studentIds = [...new Set(exam.attempts.map((attempt) => attempt.studentId))]
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true },
  })
  const names = new Map(users.map((user) => [user.id, user.fullName]))
  const count = exam.attempts.length
  const percentages = exam.attempts.map((attempt) => attempt.percentage)
  const average = count ? percentages.reduce((sum, value) => sum + value, 0) / count : 0
  const highest = count ? Math.max(...percentages) : 0
  const lowest = count ? Math.min(...percentages) : 0

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">آمار آزمون: {exam.title}</h1><p className="mt-1 text-sm text-muted-foreground">گزارش تمام شرکت‌کنندگان این آزمون</p></div>
        <Link href="/admin/simple-exams" className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-bold hover:bg-muted">بازگشت به آزمون‌ها</Link>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="شرکت‌کنندگان" value={count} />
        <Metric label="میانگین درصد" value={`${average.toFixed(2)}%`} />
        <Metric label="بالاترین درصد" value={`${highest}%`} />
        <Metric label="پایین‌ترین درصد" value={`${lowest}%`} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4"><h2 className="font-bold">نتایج دانش‌آموزان</h2></div>
        {count === 0 ? <p className="p-8 text-center text-muted-foreground">هنوز کسی در این آزمون شرکت نکرده است.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-sm">
              <thead className="bg-muted"><tr><th className="px-4 py-3">رتبه</th><th className="px-4 py-3">نام دانش‌آموز</th><th className="px-4 py-3">صحیح</th><th className="px-4 py-3">غلط</th><th className="px-4 py-3">بدون پاسخ</th><th className="px-4 py-3">درصد</th><th className="px-4 py-3">زمان ثبت</th></tr></thead>
              <tbody className="divide-y divide-border">
                {exam.attempts.map((attempt, index) => <tr key={attempt.id} className="hover:bg-muted/30"><td className="px-4 py-3 font-bold">{index + 1}</td><td className="px-4 py-3">{names.get(attempt.studentId) || "ناشناس"}</td><td className="px-4 py-3 text-green-600">{attempt.correctCount}</td><td className="px-4 py-3 text-red-600">{attempt.incorrectCount}</td><td className="px-4 py-3">{attempt.unansweredCount}</td><td className="px-4 py-3 font-bold text-primary">{attempt.percentage}%</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(attempt.submittedAt).toLocaleDateString("fa-IR")}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-extrabold text-primary">{value}</p></div>
}
