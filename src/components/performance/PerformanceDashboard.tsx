import Link from "next/link"
import type { ElementType } from "react"
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  TrendingUp,
  Users,
  XCircle,
  MinusCircle,
} from "lucide-react"
import {
  calculatePerformanceSummary,
  type SimpleExamPerformanceAttempt,
} from "@/lib/simple-exam-performance"

export type PerformanceStudent = {
  id: string
  fullName: string | null
  nationalId?: string | null
  phone?: string | null
  attempts: SimpleExamPerformanceAttempt[]
}

type Props = {
  title: string
  description: string
  students: PerformanceStudent[]
  backHref: string
  backLabel: string
  emptyMessage?: string
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function PerformanceDashboard({
  title,
  description,
  students,
  backHref,
  backLabel,
  emptyMessage = "هنوز دانش‌آموزی برای نمایش وجود ندارد.",
}: Props) {
  const allAttempts = students.flatMap((student) => student.attempts)
  const summary = calculatePerformanceSummary(allAttempts)
  const evaluatedStudents = students.filter(
    (student) => student.attempts.length > 0,
  ).length

  const sortedStudents = [...students].sort((a, b) => {
    const aSummary = calculatePerformanceSummary(a.attempts)
    const bSummary = calculatePerformanceSummary(b.attempts)

    if (bSummary.averagePercentage !== aSummary.averagePercentage) {
      return bSummary.averagePercentage - aSummary.averagePercentage
    }

    return (a.fullName ?? "").localeCompare(b.fullName ?? "", "fa")
  })

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <Link
          href={backHref}
          className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
        >
          {backLabel}
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard
          label="دانش‌آموزان"
          value={students.length}
          icon={Users}
          color="text-sky-600"
          background="bg-sky-500/10"
        />
        <MetricCard
          label="دانش‌آموزان دارای نتیجه"
          value={evaluatedStudents}
          icon={Award}
          color="text-violet-600"
          background="bg-violet-500/10"
        />
        <MetricCard
          label="آزمون‌های ثبت‌شده"
          value={summary.attempts}
          icon={ClipboardList}
          color="text-blue-600"
          background="bg-blue-500/10"
        />
        <MetricCard
          label="میانگین درصد"
          value={`${summary.averagePercentage}%`}
          icon={TrendingUp}
          color="text-emerald-600"
          background="bg-emerald-500/10"
        />
        <MetricCard
          label="پاسخ‌های صحیح"
          value={summary.correct}
          icon={CheckCircle2}
          color="text-green-600"
          background="bg-green-500/10"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4 text-red-600" /> پاسخ‌های غلط
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {summary.incorrect}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MinusCircle className="h-4 w-4" /> بدون پاسخ
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.unanswered}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpenCheck className="h-4 w-4 text-primary" /> بالاترین درصد
          </div>
          <p className="mt-2 text-2xl font-bold text-primary">
            {summary.highestPercentage}%
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">عملکرد دانش‌آموزان</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            برای مشاهده نتایج هر آزمون، ردیف دانش‌آموز را باز کنید.
          </p>
        </div>

        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-bold">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedStudents.map((student, index) => {
              const studentSummary = calculatePerformanceSummary(
                student.attempts,
              )
              const hasResults = student.attempts.length > 0
              const latestAttempts = student.attempts

              return (
                <details
                  key={student.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <summary className="cursor-pointer list-none p-4 transition hover:bg-muted/40 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {student.fullName || "بدون نام"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {student.nationalId && (
                              <span dir="ltr">{student.nationalId}</span>
                            )}
                            {student.phone && <span dir="ltr">{student.phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
                        <CompactMetric label="آزمون" value={studentSummary.attempts} />
                        <CompactMetric
                          label="میانگین"
                          value={`${studentSummary.averagePercentage}%`}
                        />
                        <CompactMetric
                          label="بالاترین"
                          value={`${studentSummary.highestPercentage}%`}
                        />
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-primary group-open:hidden">
                      نمایش جزئیات و نتایج آزمون‌ها
                    </p>
                    <p className="mt-3 hidden text-xs font-medium text-primary group-open:block">
                      بستن جزئیات
                    </p>
                  </summary>

                  <div className="border-t border-border p-4 sm:p-5">
                    {!hasResults ? (
                      <p className="rounded-xl bg-muted/50 p-5 text-center text-sm text-muted-foreground">
                        این دانش‌آموز هنوز در آزمونی شرکت نکرده است.
                      </p>
                    ) : (
                      <>
                        <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-lg">
                          <MiniTotal label="صحیح" value={studentSummary.correct} color="text-green-600" />
                          <MiniTotal label="غلط" value={studentSummary.incorrect} color="text-red-600" />
                          <MiniTotal label="بدون پاسخ" value={studentSummary.unanswered} color="text-muted-foreground" />
                        </div>

                        <div className="space-y-3">
                          {latestAttempts.map((attempt) => (
                            <article
                              key={attempt.id}
                              className="rounded-xl border border-border bg-background p-4"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <h3 className="font-bold">{attempt.examTitle}</h3>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatDate(attempt.submittedAt)}
                                  </p>
                                </div>
                                <div className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-center text-lg font-extrabold text-primary">
                                  {attempt.percentage}%
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <ResultMetric label="صحیح" value={attempt.correctCount} color="text-green-600" />
                                <ResultMetric label="غلط" value={attempt.incorrectCount} color="text-red-600" />
                                <ResultMetric label="بدون پاسخ" value={attempt.unansweredCount} color="text-muted-foreground" />
                                <ResultMetric label="نمره خام" value={`${attempt.rawScore} / ${attempt.questionCount * 3}`} color="text-foreground" />
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              )
            })}
          </div>
        )}
      </section>

      <p className="text-xs leading-6 text-muted-foreground">
        این گزارش بر اساس آزمون‌های فایل‌محور ثبت‌شده در سحا محاسبه شده است. میانگین درصد، میانگین ساده درصد تمام آزمون‌های ثبت‌شده است.
      </p>
    </main>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  background,
}: {
  label: string
  value: string | number
  icon: ElementType
  color: string
  background: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${background} ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  )
}

function CompactMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  )
}

function MiniTotal({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold ${color}`}>{value}</p>
    </div>
  )
}

function ResultMetric({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}
