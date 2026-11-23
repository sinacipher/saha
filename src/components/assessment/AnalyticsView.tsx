"use client"

import { useEffect, useState } from "react"

type SubjectMetric = { subjectId: string; name: string; correct: number; incorrect: number; unanswered: number; resultCount: number; percentage: number }
type Trend = { assessmentId: string; title: string; percentage: number; rawScore: number; correct: number; incorrect: number; unanswered: number; createdAt: string }

export default function AnalyticsView() {
  const [summary, setSummary] = useState<{ totalAttempts: number; averagePercentage: number; highestPercentage: number; lowestPercentage: number } | null>(null)
  const [trends, setTrends] = useState<Trend[]>([])
  const [subjects, setSubjects] = useState<SubjectMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch("/api/assessments/analytics", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json() as { summary: typeof summary; trends: Trend[]; subjects: SubjectMetric[] }
        setSummary(data.summary)
        setTrends(data.trends)
        setSubjects(data.subjects)
      }
      setLoading(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  if (loading) return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">در حال تحلیل عملکرد...</div>

  const weakest = [...subjects].sort((first, second) => first.percentage - second.percentage).slice(0, 3)

  return (
    <div className="space-y-5">
      {summary && <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">تعداد آزمون‌ها</div><div className="mt-2 text-2xl font-bold">{summary.totalAttempts}</div></div><div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">میانگین درصد</div><div className="mt-2 text-2xl font-bold">{summary.averagePercentage}%</div></div><div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">بیشترین درصد</div><div className="mt-2 text-2xl font-bold text-green-600">{summary.highestPercentage}%</div></div><div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">کمترین درصد</div><div className="mt-2 text-2xl font-bold text-destructive">{summary.lowestPercentage}%</div></div></div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-4 font-bold">روند درصدها</h3>{trends.length === 0 ? <p className="text-sm text-muted-foreground">داده‌ای وجود ندارد.</p> : <div className="space-y-3">{trends.map((trend) => <div key={trend.assessmentId}><div className="mb-1 flex justify-between text-xs"><span className="truncate">{trend.title}</span><span dir="ltr">{trend.percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, trend.percentage))}%` }} /></div></div>)}</div>}</div>
        <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-4 font-bold">ضعف و قوت درس‌ها</h3>{subjects.length === 0 ? <p className="text-sm text-muted-foreground">داده‌ای وجود ندارد.</p> : <div className="space-y-3">{subjects.map((subject) => <div key={subject.subjectId}><div className="mb-1 flex justify-between text-xs"><span>{subject.name}</span><span dir="ltr">{subject.percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${subject.percentage}%` }} /></div></div>)}</div>}</div>
      </div>

      {weakest.length > 0 && <div className="rounded-xl border border-border bg-card p-5"><h3 className="mb-3 font-bold">درس‌های نیازمند توجه</h3><div className="flex flex-wrap gap-2">{weakest.map((subject) => <span key={subject.subjectId} className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{subject.name}: {subject.percentage}%</span>)}</div></div>}
    </div>
  )
}
