"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

type ExamSummary = {
  id: string
  title: string
  description: string | null
  type: "KONKUR_SIMULATION" | "PRACTICE_QUIZ"
  status: string
  durationSeconds: number
  startAt: string | null
  endAt: string | null
  sectionCount: number
  questionCount: number
  activeAttemptId: string | null
  publishedResultId: string | null
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch("/api/assessments/student/exams", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json() as { exams: ExamSummary[] }
        setExams(data.exams)
      }
      setLoading(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">آزمون‌های من</h2><p className="mt-1 text-sm text-muted-foreground">آزمون‌های تعیین‌شده، در حال اجرا و تکمیل‌شده</p></div>
      {loading && <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">در حال بارگذاری...</div>}
      {!loading && exams.length === 0 && <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">آزمونی برای شما تخصیص داده نشده است.</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {exams.map((exam) => (
          <div key={exam.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{exam.title}</h3><p className="mt-1 text-sm text-muted-foreground">{exam.description || "بدون توضیح"}</p></div><span className="rounded-lg bg-muted px-2 py-1 text-xs">{exam.type === "KONKUR_SIMULATION" ? "کنکور" : "تمرین"}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-muted/50 p-2"><div className="text-muted-foreground">سوالات</div><div className="mt-1 font-bold">{exam.questionCount}</div></div><div className="rounded-lg bg-muted/50 p-2"><div className="text-muted-foreground">بخش‌ها</div><div className="mt-1 font-bold">{exam.sectionCount}</div></div><div className="rounded-lg bg-muted/50 p-2"><div className="text-muted-foreground">مدت</div><div className="mt-1 font-bold">{Math.round(exam.durationSeconds / 60)}د</div></div></div>
            <div className="mt-4 flex gap-2">{exam.publishedResultId ? <Link href={`/student/assessments/${exam.id}/result`} className="flex-1 rounded-lg border border-border py-2 text-center text-sm">مشاهده نتیجه</Link> : null}<Link href={`/student/assessments/${exam.id}`} className="flex-1 rounded-lg bg-primary py-2 text-center text-sm font-medium text-primary-foreground">{exam.activeAttemptId ? "ادامه آزمون" : "شروع آزمون"}</Link></div>
          </div>
        ))}
      </div>
    </div>
  )
}
