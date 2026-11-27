"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useFeedback } from "@/components/feedback/FeedbackProvider"
import { Clock3, Download, Loader2, Send, Info, Save } from "lucide-react"

type Exam = {
  id: string
  title: string
  instructions?: string | null
  questionCount: number
  initialRemainingMs: number
  initialAnswers: Record<string, string>
}

type SaveStatus = "saved" | "saving" | "error"

export default function ExamUI({
  params,
  exam,
}: {
  params: { id: string }
  exam: Exam
}) {
  const router = useRouter()
  const { notify, confirmAction } = useFeedback()
  const [answers, setAnswers] = useState<Record<string, string>>(exam.initialAnswers)
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil(exam.initialRemainingMs / 1000)))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const answersRef = useRef<Record<string, string>>(exam.initialAnswers)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const submittedRef = useRef(false)
  const isSubmittingRef = useRef(false)
  const confirmationPendingRef = useRef(false)
  const autoSubmitStartedRef = useRef(false)

  const queueAnswersSave = useCallback((snapshot: Record<string, string>) => {
    setSaveStatus("saving")

    const task = saveQueueRef.current.catch(() => undefined).then(async () => {
      const response = await fetch(`/api/simple-exams/${params.id}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: snapshot }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "ذخیره پاسخ‌ها ناموفق بود.")
    })

    saveQueueRef.current = task
    void task.then(
      () => {
        if (saveQueueRef.current === task) setSaveStatus("saved")
      },
      () => {
        if (saveQueueRef.current === task) setSaveStatus("error")
      },
    )
    return task
  }, [params.id])

  const handleAnswerChange = (questionNumber: string, option: string) => {
    if (isSubmittingRef.current || submittedRef.current || timeLeft <= 0) return
    const nextAnswers = { ...answersRef.current, [questionNumber]: option }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)
    void queueAnswersSave(nextAnswers).catch(() => undefined)
  }

  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current || isSubmittingRef.current || (!auto && confirmationPendingRef.current)) return
    if (auto) autoSubmitStartedRef.current = true

    if (!auto) {
      confirmationPendingRef.current = true
      const accepted = await confirmAction({
        title: "ثبت نهایی آزمون",
        description: "بعد از ثبت نهایی، امکان تغییر پاسخ‌ها وجود ندارد. پاسخ‌های ذخیره‌شده تصحیح می‌شوند و کارنامه نمایش داده خواهد شد.",
        confirmLabel: "ثبت نهایی پاسخ‌ها",
        cancelLabel: "بازگشت به آزمون",
        danger: false,
      })
      confirmationPendingRef.current = false
      if (!accepted || submittedRef.current) return
    }

    submittedRef.current = true
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setMessage(auto
      ? "زمان آزمون تمام شد. پاسخ‌های ذخیره‌شده در حال ثبت نهایی هستند..."
      : "پاسخ‌ها در حال ذخیره، ثبت و تصحیح هستند...")

    try {
      if (!auto) {
        // Send the newest full snapshot and wait for the database confirmation.
        await queueAnswersSave(answersRef.current)
      } else {
        // The last autosave may be rejected at the deadline; the server finalizes
        // only answers that were successfully stored before the deadline.
        try {
          await saveQueueRef.current
        } catch {
          // Continue with the last successfully persisted snapshot.
        }
      }

      const response = await fetch(`/api/simple-exams/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmit: auto }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "ثبت پاسخ‌ها ناموفق بود.")

      notify({
        title: "آزمون با موفقیت ثبت شد",
        description: "کارنامه شما در حال نمایش است.",
        variant: "success",
        duration: 2500,
      })
      router.replace(`/student/simple-exams/${params.id}/result`)
    } catch (error) {
      submittedRef.current = false
      isSubmittingRef.current = false
      setIsSubmitting(false)
      const errorMessage = error instanceof Error ? error.message : "خطای نامشخص هنگام ثبت پاسخ‌ها."
      setMessage(errorMessage)
      if (auto && errorMessage.includes("هنوز زمان آزمون")) {
        autoSubmitStartedRef.current = false
      }
      notify({ title: "ثبت آزمون ناموفق بود", description: errorMessage, variant: "error" })
    }
  }, [params.id, router, notify, confirmAction, queueAnswersSave])

  useEffect(() => {
    const startedAt = performance.now()
    const initialMs = Math.max(0, exam.initialRemainingMs)

    const updateRemaining = () => {
      const elapsedMs = performance.now() - startedAt
      const next = Math.max(0, Math.ceil((initialMs - elapsedMs) / 1000))
      setTimeLeft((previous) => previous === next ? previous : next)
    }

    const timer = window.setInterval(updateRemaining, 250)
    document.addEventListener("visibilitychange", updateRemaining)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", updateRemaining)
    }
  }, [exam.initialRemainingMs])

  useEffect(() => {
    if (timeLeft === 0 && !submittedRef.current && !isSubmitting && !autoSubmitStartedRef.current) {
      void handleSubmit(true)
    }
  }, [timeLeft, isSubmitting, handleSubmit])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
  }
  const answeredCount = Object.keys(answers).length

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">آزمون فعال</p>
          <h1 className="text-xl font-bold">{exam.title}</h1>
        </div>
        <div className={`flex items-center justify-center gap-3 rounded-xl px-5 py-3 text-xl font-bold ${timeLeft <= 60 ? "animate-pulse bg-red-500/10 text-red-600" : "bg-muted text-foreground"}`} dir="ltr">
          <Clock3 className="h-5 w-5" />{formatTime(timeLeft)}
        </div>
      </header>

      {exam.instructions && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold text-amber-700"><Info className="h-5 w-5" />توضیحات و دستورالعمل آزمون</div>
          <p className="whitespace-pre-line text-sm leading-7 text-foreground">{exam.instructions}</p>
        </section>
      )}

      {message && (
        <div role="status" aria-live="polite" className={`rounded-xl border p-4 text-sm leading-7 ${isSubmitting ? "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300" : "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-300"}`}>
          {message}
          {timeLeft === 0 && !isSubmitting && (
            <button type="button" onClick={() => { autoSubmitStartedRef.current = true; void handleSubmit(true) }} className="mt-3 block rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">
              تلاش مجدد برای ثبت پاسخ‌ها
            </button>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 text-center">
        <p className="mb-4 text-sm leading-7">فایل سوالات را دانلود کنید و سپس پاسخ هر سوال را در فرم زیر ثبت کنید.</p>
        <a href={`/api/simple-exams/${params.id}/file`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700">
          <Download className="h-5 w-5" />دانلود فایل آزمون
        </a>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3 md:grid-cols-4 md:p-5">
        {Array.from({ length: exam.questionCount }, (_, index) => {
          const number = String(index + 1)
          return (
            <div key={number} className="rounded-xl border border-border bg-background p-3">
              <p className="mb-3 text-center font-bold">سوال {number}</p>
              <div className="flex justify-between gap-2">
                {(["A", "B", "C", "D"] as const).map((option) => (
                  <label key={option} className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border p-2 transition ${answers[number] === option ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"} ${isSubmitting || timeLeft === 0 ? "cursor-not-allowed opacity-50" : ""}`}>
                    <input
                      type="radio"
                      name={`question-${number}`}
                      value={option}
                      checked={answers[number] === option}
                      disabled={isSubmitting || timeLeft === 0}
                      onChange={() => handleAnswerChange(number, option)}
                      className="accent-primary"
                    />
                    <span className="mt-1 text-sm font-bold">{option === "A" ? "الف" : option === "B" ? "ب" : option === "C" ? "ج" : "د"}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">تعداد پاسخ‌های انتخاب‌شده</span>
          <span className="font-bold">{answeredCount} از {exam.questionCount}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(answeredCount / exam.questionCount) * 100}%` }} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Save className="h-4 w-4" />
          {saveStatus === "saving" && "در حال ذخیره خودکار پاسخ‌ها..."}
          {saveStatus === "saved" && "همه پاسخ‌ها در سرور ذخیره شده‌اند."}
          {saveStatus === "error" && <span className="font-medium text-red-600">ذخیره پاسخ ناموفق بود؛ با انتخاب دوباره پاسخ یا ثبت نهایی مجدداً تلاش کنید.</span>}
        </div>
        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={isSubmitting || timeLeft === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 p-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? <><Loader2 className="h-5 w-5 animate-spin" />در حال ثبت و تصحیح...</>
            : <><Send className="h-5 w-5" />ثبت نهایی و مشاهده نتیجه</>}
        </button>
      </section>
    </main>
  )
}
