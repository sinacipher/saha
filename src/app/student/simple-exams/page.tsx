import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function StudentSimpleExamsList() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") redirect("/login")

  const now = new Date()
  const exams = await prisma.simpleExam.findMany({
    where: {
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      instructions: true,
      questionCount: true,
      durationMinutes: true,
      startAt: true,
      endAt: true,
      resultsPublished: true,
      attempts: {
        where: { studentId: session.user.id },
        select: { id: true, percentage: true },
        take: 1,
      },
    },
  })

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-bold text-primary">فضای آموزشی ریمو</p>
        <h1 className="mt-1 text-2xl font-black">آزمون‌های من</h1>
        <p className="mt-2 text-sm text-muted-foreground">آزمون‌های فعال را مشاهده کنید و کارنامه‌های منتشرشده را بررسی کنید.</p>
      </header>

      {exams.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center">
          <h2 className="font-bold">آزمونی در دسترس نیست</h2>
          <p className="mt-2 text-sm text-muted-foreground">در حال حاضر آزمون فعالی برای شما ثبت نشده است.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const attempt = exam.attempts[0]
            return (
              <article key={exam.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-card">
                <div>
                  <h2 className="text-lg font-bold">{exam.title}</h2>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{exam.questionCount} سوال</p>
                    <p>{exam.durationMinutes} دقیقه</p>
                    {exam.endAt && <p>پایان مهلت: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(exam.endAt)}</p>}
                  </div>
                  {exam.instructions && <div className="mt-4 whitespace-pre-line rounded-xl bg-muted/50 p-3 text-sm leading-6">{exam.instructions}</div>}
                </div>
                {attempt ? (
                  exam.resultsPublished ? (
                    <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center text-sm font-medium text-emerald-700">
                      آزمون ثبت شده است · نتیجه: {attempt.percentage}%
                      <Link href={`/student/simple-exams/${exam.id}/result`} className="mt-2 block font-bold underline">مشاهده کارنامه</Link>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center text-sm leading-6 text-amber-800">
                      پاسخ‌های شما ثبت شده است. کارنامه پس از انتشار توسط مسئول آزمون نمایش داده می‌شود.
                    </div>
                  )
                ) : (
                  <Link href={`/student/simple-exams/${exam.id}`} className="mt-5 block rounded-xl bg-primary p-3 text-center font-bold text-primary-foreground transition hover:bg-primary-600">شرکت در آزمون</Link>
                )}
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
