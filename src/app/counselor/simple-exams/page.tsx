"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useFeedback } from "@/components/feedback/FeedbackProvider"
import { FilePlus2, ClipboardList, Loader2, TrendingUp } from "lucide-react"

type SimpleExam = {
  id: string
  title: string
  instructions: string | null
  questionCount: number
  durationMinutes: number
}

export default function CounselorSimpleExamsPage() {
  const { notify } = useFeedback()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [duration, setDuration] = useState(60)
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [loadingExams, setLoadingExams] = useState(true)
  const [exams, setExams] = useState<SimpleExam[]>([])

  const fetchExams = useCallback(async () => {
    try {
      const response = await fetch("/api/simple-exams", { cache: "no-store" })
      const data = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(data)) {
        throw new Error(data?.error || "دریافت فهرست آزمون‌ها ناموفق بود.")
      }
      setExams(data)
    } catch (error) {
      notify({
        title: "دریافت آزمون‌ها ناموفق بود",
        description: error instanceof Error ? error.message : "خطای ارتباط با سرور.",
        variant: "error",
      })
    } finally {
      setLoadingExams(false)
    }
  }, [notify])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchExams()
  }, [fetchExams])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !file) {
      notify({ title: "اطلاعات ناقص است", description: "عنوان و فایل سوالات الزامی هستند.", variant: "warning" })
      return
    }
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 300) {
      notify({ title: "تعداد سوالات نامعتبر است", description: "تعداد باید بین ۱ تا ۳۰۰ باشد.", variant: "warning" })
      return
    }
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) {
      notify({ title: "زمان آزمون نامعتبر است", description: "مدت باید بین ۱ تا ۶۰۰ دقیقه باشد.", variant: "warning" })
      return
    }
    if (Object.keys(answerKey).length !== questionCount) {
      notify({ title: "کلید پاسخ کامل نیست", description: "پاسخ صحیح تمام سوالات را مشخص کنید.", variant: "warning" })
      return
    }

    setLoading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("title", title.trim())
      body.append("instructions", instructions.trim())
      body.append("questionCount", String(questionCount))
      body.append("durationMinutes", String(duration))
      body.append("answerKeyJson", JSON.stringify(answerKey))

      const response = await fetch("/api/simple-exams", { method: "POST", body })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "ایجاد آزمون ناموفق بود.")

      setTitle("")
      setInstructions("")
      setFile(null)
      setQuestionCount(10)
      setDuration(60)
      setAnswerKey({})
      if (fileInputRef.current) fileInputRef.current.value = ""

      notify({ title: "آزمون ایجاد شد", description: "آزمون در فهرست مشترک پنل‌ها ذخیره شد.", variant: "success" })
      await fetchExams()
    } catch (error) {
      notify({ title: "ایجاد آزمون ناموفق بود", description: error instanceof Error ? error.message : "خطای نامشخص.", variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">آزمون‌ها و نتایج</h1>
          <p className="mt-2 text-sm text-muted-foreground">تمام آزمون‌های ثبت‌شده در سحا را مشاهده کنید یا آزمون جدید بسازید.</p>
        </div>
        <Link href="/counselor/performance" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted"><TrendingUp className="h-4 w-4" />عملکرد دانش‌آموزان</Link>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><FilePlus2 className="h-6 w-6" /></div>
          <div><h2 className="text-xl font-bold">ایجاد آزمون جدید</h2><p className="text-sm text-muted-foreground">کلید پاسخ توسط سامانه برای دانش‌آموز به صورت خودکار تصحیح می‌شود.</p></div>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-bold"><span>عنوان آزمون</span><input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-primary" /></label>
            <label className="space-y-2 text-sm font-bold"><span>فایل سوالات</span><input ref={fileInputRef} required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal" /></label>
            <label className="space-y-2 text-sm font-bold"><span>تعداد سوالات</span><input required type="number" min={1} max={300} value={questionCount} onChange={(e) => { setQuestionCount(Number(e.target.value)); setAnswerKey({}) }} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
            <label className="space-y-2 text-sm font-bold"><span>مدت آزمون (دقیقه)</span><input required type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded-xl border border-border bg-background px-4 py-3 font-normal" /></label>
          </div>
          <label className="block space-y-2 text-sm font-bold"><span>توضیحات و دستورالعمل برای دانش‌آموز</span><textarea rows={3} maxLength={2000} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 font-normal outline-none focus:border-primary" placeholder="راهنمای آزمون و نکات مهم را وارد کنید..." /><span className="block text-left text-xs font-normal text-muted-foreground">{instructions.length}/2000</span></label>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold">کلید پاسخ آزمون</h3><span className="text-xs text-muted-foreground">{Object.keys(answerKey).length} از {questionCount} تکمیل شده</span></div>
            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-4 md:grid-cols-5">
              {Array.from({ length: Math.max(0, Math.min(questionCount, 300)) }, (_, i) => { const number = String(i + 1); return <label key={number} className="rounded-xl border border-border bg-card p-3 text-center text-sm font-bold"><span className="mb-2 block">سوال {number}</span><select value={answerKey[number] || ""} onChange={(e) => setAnswerKey((current) => ({ ...current, [number]: e.target.value }))} className="w-full rounded-lg border border-border bg-background p-2 text-sm font-normal"><option value="">انتخاب</option><option value="A">الف (A)</option><option value="B">ب (B)</option><option value="C">ج (C)</option><option value="D">د (D)</option></select></label> })}
            </div>
          </div>
          <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> در حال ذخیره...</> : "ایجاد و ذخیره آزمون"}</button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">فهرست تمام آزمون‌ها</h2><span className="rounded-full bg-muted px-3 py-1 text-sm font-bold">{exams.length} آزمون</span></div>
        {loadingExams ? <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />در حال دریافت آزمون‌ها...</div> : exams.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">هنوز آزمونی ایجاد نشده است.</div> : (
          <div className="space-y-3">{exams.map((exam) => <article key={exam.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="min-w-0"><h3 className="break-words font-bold">{exam.title}</h3><p className="mt-1 text-sm text-muted-foreground">{exam.questionCount} سوال · {exam.durationMinutes} دقیقه</p>{exam.instructions && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">{exam.instructions}</p>}</div><Link href={`/counselor/simple-exams/${exam.id}/submissions`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"><ClipboardList className="h-4 w-4" />نتایج دانش‌آموزان من</Link></article>)}</div>
        )}
      </section>
    </main>
  )
}
