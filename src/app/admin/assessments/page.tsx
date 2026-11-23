import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function AdminAssessmentsPage() {
  const [questions, assessments, importsCount, pendingQuestions] = await Promise.all([
    prisma.question.count({ where: { status: { not: "ARCHIVED" } } }),
    prisma.assessment.count(),
    prisma.importBatch.count(),
    prisma.question.count({ where: { status: "PENDING_REVIEW" } })
  ])

  const cards = [
    ["کل سوالات", questions],
    ["آزمون‌ها", assessments],
    ["در انتظار بررسی", pendingQuestions],
    ["batchهای واردسازی", importsCount]
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">مدیریت آزمون‌ها</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-bold text-primary">{value}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/assessments/questions" className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">بانک سؤال</Link>
        <Link href="/admin/assessments/exams" className="rounded-lg border border-border px-4 py-2 font-medium">ساخت آزمون</Link>
        <Link href="/admin/assessments/imports" className="rounded-lg border border-border px-4 py-2 font-medium">تاریخچه واردسازی</Link>
        <Link href="/admin/assessments/analytics" className="rounded-lg border border-border px-4 py-2 font-medium">تحلیل‌ها</Link>
      </div>
    </div>
  )
}
