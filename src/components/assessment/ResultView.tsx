"use client"

import { useEffect, useState } from "react"

type Result = {
  id: string
  assessmentId: string
  assessmentTitle: string
  studentName: string
  attemptNumber: number
  submittedAt: string | null
  timeSpentSeconds: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  unansweredAnswers: number
  rawScore: number
  percentage: number
  percentile: number | null
  internalRank: number | null
  publishedAt: string | null
}

export default function ResultView({ assessmentId }: { assessmentId?: string }) {
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = assessmentId ? `?assessmentId=${encodeURIComponent(assessmentId)}` : ""
      const response = await fetch(`/api/assessments/results${query}`, { cache: "no-store" })
      if (response.ok) {
        const data = await response.json() as { results: Result[] }
        setResults(data.results)
      }
      setLoading(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [assessmentId])

  if (loading) return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">در حال بارگذاری نتایج...</div>
  if (results.length === 0) return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">نتیجه منتشر‌شده‌ای وجود ندارد.</div>

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div key={result.id} className="rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-bold">{result.assessmentTitle}</h3><p className="mt-1 text-sm text-muted-foreground">{result.studentName} — تلاش {result.attemptNumber}</p></div><div className="rounded-xl bg-primary px-5 py-3 text-center text-primary-foreground"><div className="text-xs">درصد</div><div className="mt-1 text-2xl font-bold dir-ltr">{result.percentage}%</div></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5"><div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-xs text-muted-foreground">کل سوالات</div><div className="mt-1 font-bold">{result.totalQuestions}</div></div><div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-xs text-muted-foreground">صحیح</div><div className="mt-1 font-bold text-green-600">{result.correctAnswers}</div></div><div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-xs text-muted-foreground">غلط</div><div className="mt-1 font-bold text-destructive">{result.incorrectAnswers}</div></div><div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-xs text-muted-foreground">بدون پاسخ</div><div className="mt-1 font-bold">{result.unansweredAnswers}</div></div><div className="rounded-lg bg-muted/50 p-3 text-center"><div className="text-xs text-muted-foreground">امتیاز خام</div><div className="mt-1 font-bold">{result.rawScore}</div></div></div>
          {(result.percentile !== null || result.internalRank !== null) && <div className="mt-4 flex gap-4 text-sm"><span>رتبه داخلی: {result.internalRank ?? "—"}</span><span>صدک: {result.percentile ?? "—"}</span></div>}
          <div className="mt-4 text-xs text-muted-foreground dir-ltr text-right">زمان صرف‌شده: {Math.round(result.timeSpentSeconds / 60)} دقیقه</div>
        </div>
      ))}
    </div>
  )
}
