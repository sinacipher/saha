import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSimpleExamAttemptsByStudent, calculatePerformanceSummary } from "@/lib/simple-exam-performance"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  XCircle,
} from "lucide-react"

export const dynamic = "force-dynamic"

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function ParentPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login")
  }

  const profile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      student: {
        include: {
          counselor: true,
          user: true,
        },
      },
    },
  })

  const child = profile?.student?.user

  if (!child) {
    return (
      <main className="mx-auto max-w-4xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold md:text-3xl">داشبورد والدین</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            مشاهده کارنامه و روند تحصیلی دانش‌آموز
          </p>
        </header>
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <Award className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <h2 className="font-bold">دانش‌آموزی به حساب شما متصل نشده است</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            برای اتصال دانش‌آموز و مشاهده کارنامه، با مدیر سامانه تماس بگیرید.
          </p>
        </div>
      </main>
    )
  }

  const attemptsByStudent = await getSimpleExamAttemptsByStudent([child.id])
  const attempts = attemptsByStudent.get(child.id) ?? []
  const summary = calculatePerformanceSummary(attempts)
  const counselor = profile?.student?.counselor

  const statCards = [
    {
      label: "تعداد آزمون‌های ثبت‌شده",
      value: summary.attempts,
      icon: ClipboardList,
      color: "text-blue-600",
      background: "bg-blue-500/10",
    },
    {
      label: "میانگین درصد",
      value: `${summary.averagePercentage}%`,
      icon: TrendingUp,
      color: "text-primary",
      background: "bg-primary/10",
    },
    {
      label: "بالاترین درصد",
      value: `${summary.highestPercentage}%`,
      icon: Award,
      color: "text-violet-600",
      background: "bg-violet-500/10",
    },
    {
      label: "پاسخ‌های صحیح",
      value: summary.correct,
      icon: CheckCircle2,
      color: "text-green-600",
      background: "bg-green-500/10",
    },
  ]

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">داشبورد والدین</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          وضعیت تحصیلی و نتایج آزمون‌های {child.fullName || "فرزند شما"}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-xs font-bold text-muted-foreground">دانش‌آموز متصل به حساب</p>
        <h2 className="mt-2 text-xl font-bold">
          {child.fullName || "بدون نام"}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span dir="ltr">{child.nationalId}</span>
          <span dir="ltr">{child.phone}</span>
          <span>
            مشاور: {counselor?.fullName || "هنوز تعیین نشده"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon
          return (
            <article key={item.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.background} ${item.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${item.color}`}>{item.value}</p>
            </article>
          )
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/parent/performance"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          <TrendingUp className="h-4 w-4" />
          مشاهده کارنامه کامل
        </Link>
        {counselor && (
          <Link
            href="/parent/chat"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
          >
            <MessageSquare className="h-4 w-4" />
            گفت‌وگو با مشاور
          </Link>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">آخرین نتایج آزمون‌ها</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              نتایج پس از ثبت آزمون به صورت خودکار در این بخش نمایش داده می‌شوند.
            </p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <BookOpenCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-bold">هنوز نتیجه آزمونی ثبت نشده است</p>
            <p className="mt-2 text-sm text-muted-foreground">
              پس از شرکت دانش‌آموز در آزمون، کارنامه اینجا قرار می‌گیرد.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.slice(0, 5).map((attempt) => (
              <article key={attempt.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words font-bold">{attempt.examTitle}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(attempt.submittedAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/10 px-4 py-2 text-center text-xl font-extrabold text-primary">
                    {attempt.percentage}%
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-md">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <div className="flex items-center gap-1 text-xs text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> صحیح
                    </div>
                    <p className="mt-1 font-bold text-green-700">{attempt.correctCount}</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <div className="flex items-center gap-1 text-xs text-red-700">
                      <XCircle className="h-3.5 w-3.5" /> غلط
                    </div>
                    <p className="mt-1 font-bold text-red-700">{attempt.incorrectCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">بدون پاسخ</p>
                    <p className="mt-1 font-bold">{attempt.unansweredCount}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {!counselor && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-700">
          هنوز مشاوری برای این دانش‌آموز تعیین نشده است. گزارش کارنامه قابل مشاهده است، اما بخش گفت‌وگو پس از تعیین مشاور فعال می‌شود.
        </p>
      )}
    </main>
  )
}
