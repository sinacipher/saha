import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, MinusCircle, Award, Clock3 } from "lucide-react"

export default async function SimpleExamResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "STUDENT") redirect("/")

  const attempt = await prisma.simpleExamAttempt.findUnique({
    where: {
      examId_studentId: {
        examId: id,
        studentId: session.user.id,
      },
    },
    include: {
      exam: { select: { id: true, title: true, questionCount: true, resultsPublished: true } },
    },
  })

  if (!attempt) notFound()
  if (!attempt.submittedAt) redirect(`/student/simple-exams/${id}`)

  if (!attempt.exam.resultsPublished) {
    return (
      <main className="mx-auto mt-10 max-w-2xl space-y-5 p-4">
        <section className="rounded-2xl border border-amber-500/20 bg-card p-7 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700"><Clock3 className="h-7 w-7" /></div>
          <h1 className="text-xl font-black">کارنامه هنوز منتشر نشده است</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">پاسخ‌های شما با موفقیت ثبت شده‌اند. جزئیات و درصد نهایی پس از انتشار نتیجه توسط مدیر یا مشاور نمایش داده می‌شود.</p>
        </section>
        <Link href="/student/simple-exams" className="block rounded-xl bg-primary px-5 py-3 text-center font-bold text-primary-foreground transition hover:bg-primary-600">بازگشت به آزمون‌ها</Link>
      </main>
    )
  }

  const resultCards = [
    { label: "پاسخ صحیح", value: attempt.correctCount, icon: CheckCircle2, color: "text-green-600", background: "bg-green-500/10" },
    { label: "پاسخ غلط", value: attempt.incorrectCount, icon: XCircle, color: "text-red-600", background: "bg-red-500/10" },
    { label: "بدون پاسخ", value: attempt.unansweredCount, icon: MinusCircle, color: "text-muted-foreground", background: "bg-muted" },
    { label: "درصد نهایی", value: `${attempt.percentage}%`, icon: Award, color: "text-primary", background: "bg-primary/10" },
  ]

  const submittedAt = new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(attempt.submittedAt)

  return (
    <main className="mx-auto mt-8 max-w-3xl space-y-6 p-4 md:mt-12 md:p-6">
      <header className="rounded-2xl border border-border bg-card p-7 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Award className="h-9 w-9" /></div>
        <p className="text-sm font-bold text-emerald-600">نتیجه آزمون منتشر شده است</p>
        <h1 className="mt-3 text-2xl font-black md:text-3xl">کارنامه آزمون</h1>
        <h2 className="mt-3 text-lg font-medium text-muted-foreground">{attempt.exam.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">زمان ثبت: {submittedAt}</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {resultCards.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-2xl border border-border bg-card p-4 text-center shadow-card">
              <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${item.background} ${item.color}`}><Icon className="h-5 w-5" /></div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className={`mt-2 text-2xl font-black ${item.color}`}>{item.value}</p>
            </article>
          )
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-bold">خلاصه عملکرد</h2>
        <div className="mt-5 flex items-center justify-between text-sm"><span className="text-muted-foreground">درصد آزمون</span><span className="font-bold">{attempt.percentage}%</span></div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, attempt.percentage))}%` }} /></div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-muted/50 p-4"><p className="text-muted-foreground">نمره خام</p><p className="mt-2 text-lg font-bold">{attempt.rawScore}</p></div>
          <div className="rounded-xl bg-muted/50 p-4"><p className="text-muted-foreground">حداکثر نمره خام</p><p className="mt-2 text-lg font-bold">{attempt.exam.questionCount * 3}</p></div>
        </div>
      </section>

      <Link href="/student/simple-exams" className="block rounded-xl bg-primary px-5 py-4 text-center font-bold text-primary-foreground transition hover:bg-primary-600">بازگشت به آزمون‌ها</Link>
    </main>
  )
}
