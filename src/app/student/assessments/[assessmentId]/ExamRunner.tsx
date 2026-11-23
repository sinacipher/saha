"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cacheAnswer, clearPendingAnswer, getPendingAnswers } from "@/lib/assessment/answer-recovery"

type Question = {
  id: string
  text: string
  topic: string | null
  difficulty: string
  options: Array<{ optionKey: string; text: string }>
}
type Section = { id: string; title: string; durationSeconds: number | null; questions: Question[] }
type AnswerState = { optionKey: string | null; markedForReview: boolean }

export default function ExamRunner({ assessmentId }: { assessmentId: string }) {
  const [attemptId, setAttemptId] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [startedAt, setStartedAt] = useState("")
  const [sections, setSections] = useState<Section[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState<{ percentage: number; correctAnswers: number; incorrectAnswers: number; unansweredAnswers: number } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const submittingRef = useRef(false)

  const section = sections[sectionIndex]
  const question = section?.questions[questionIndex]
  const answer = question ? answers[question.id] : undefined

  const allQuestions = useMemo(() => sections.flatMap((item) => item.questions), [sections])

  const startAndLoad = useCallback(async () => {
    setLoading(true)
    setError("")

    const startResponse = await fetch(`/api/assessments/student/attempt/${assessmentId}`, { method: "POST" })
    const startData = await startResponse.json() as { attemptId?: string; expiresAt?: string; error?: string }
    if (!startResponse.ok || !startData.attemptId || !startData.expiresAt) {
      setError(startData.error || "امکان شروع آزمون وجود ندارد")
      setLoading(false)
      return
    }

    const loadResponse = await fetch(`/api/assessments/student/attempt/${assessmentId}`, { cache: "no-store" })
    const data = await loadResponse.json() as {
      attempt?: { id: string; startedAt: string; expiresAt: string }
      sections?: Section[]
      answers?: Record<string, AnswerState>
      error?: string
    }

    if (!loadResponse.ok || !data.attempt || !data.sections) {
      setError(data.error || "بارگذاری آزمون ناموفق بود")
      setLoading(false)
      return
    }

    setAttemptId(data.attempt.id)
    setExpiresAt(data.attempt.expiresAt)
    setStartedAt(data.attempt.startedAt)
    setSections(data.sections)
    setAnswers(data.answers || {})
    setLoading(false)
  }, [assessmentId])

  useEffect(() => {
    const timer = setTimeout(startAndLoad, 0)
    return () => clearTimeout(timer)
  }, [startAndLoad])

  useEffect(() => {
    if (!expiresAt) return
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setRemainingSeconds(remaining)
    }
    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const submitAttempt = useCallback(async () => {
    if (!attemptId || submittingRef.current) return
    submittingRef.current = true

    const started = startedAt ? new Date(startedAt).getTime() : Date.now()
    const timeSpentSeconds = Math.max(0, Math.round((Date.now() - started) / 1000))

    const response = await fetch(`/api/assessments/student/submit/${attemptId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeSpentSeconds })
    })

    const data = await response.json() as {
      percentage?: number
      correctAnswers?: number
      incorrectAnswers?: number
      unansweredAnswers?: number
      error?: string
    }

    if (response.ok) {
      setSubmitted({
        percentage: data.percentage || 0,
        correctAnswers: data.correctAnswers || 0,
        incorrectAnswers: data.incorrectAnswers || 0,
        unansweredAnswers: data.unansweredAnswers || 0
      })
      setConfirmOpen(false)
      localStorage.removeItem(`exam-cache-${attemptId}`)
    } else {
      setError(data.error || "ثبت آزمون ناموفق بود")
      submittingRef.current = false
    }
  }, [attemptId, startedAt])

  useEffect(() => {
    if (remainingSeconds !== 0 || !attemptId || submitted) return

    const expirationSubmit = setTimeout(() => {
      submitAttempt()
    }, 0)

    return () => clearTimeout(expirationSubmit)
  }, [remainingSeconds, attemptId, submitted, submitAttempt])

  const saveAnswer = async (optionKey: string | null, markedForReview?: boolean) => {
    if (!attemptId || !question) return

    const current = answers[question.id] || { optionKey: null, markedForReview: false }
    const next = {
      optionKey,
      markedForReview: markedForReview ?? current.markedForReview
    }

    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: next }))

    const cacheKey = `exam-cache-${attemptId}`
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "{}") as Record<string, AnswerState>
    localStorage.setItem(cacheKey, JSON.stringify({ ...cached, [question.id]: next }))

    await cacheAnswer(attemptId, {
      questionId: question.id,
      optionKey: next.optionKey,
      markedForReview: next.markedForReview,
      updatedAt: Date.now()
    })

    try {
      const response = await fetch(`/api/assessments/student/answer/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, ...next })
      })
      if (response.ok) {
        await clearPendingAnswer(attemptId, question.id)
      }
    } catch {
      setError("پاسخ به‌صورت موقت ذخیره شد و هنگام اتصال مجدد ارسال می‌شود.")
    }
  }

  const syncCachedAnswers = useCallback(async () => {
    if (!attemptId) return
    const pending = await getPendingAnswers(attemptId)
    for (const answer of pending) {
      const response = await fetch(`/api/assessments/student/answer/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: answer.questionId,
          optionKey: answer.optionKey,
          markedForReview: answer.markedForReview
        })
      })
      if (response.ok) {
        await clearPendingAnswer(attemptId, answer.questionId)
      }
    }
  }, [attemptId])

  useEffect(() => {
    if (!attemptId) return
    syncCachedAnswers().catch(() => undefined)
    const handleOnline = () => { syncCachedAnswers().catch(() => undefined) }
    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
  }, [attemptId, syncCachedAnswers])

  const moveQuestion = (nextSectionIndex: number, nextQuestionIndex: number) => {
    if (nextSectionIndex < 0 || nextSectionIndex >= sections.length) return
    if (nextQuestionIndex < 0 || nextQuestionIndex >= sections[nextSectionIndex].questions.length) return
    setSectionIndex(nextSectionIndex)
    setQuestionIndex(nextQuestionIndex)
  }

  const goNext = () => {
    if (questionIndex + 1 < section.questions.length) {
      setQuestionIndex((current) => current + 1)
    } else if (sectionIndex + 1 < sections.length) {
      setSectionIndex((current) => current + 1)
      setQuestionIndex(0)
    }
  }

  const goPrevious = () => {
    if (questionIndex > 0) {
      setQuestionIndex((current) => current - 1)
    } else if (sectionIndex > 0) {
      const previousSection = sectionIndex - 1
      setSectionIndex(previousSection)
      setQuestionIndex(sections[previousSection].questions.length - 1)
    }
  }

  if (loading) return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">در حال آماده‌سازی آزمون...</div>
  if (error && !attemptId) return <div className="rounded-xl border border-border bg-card p-8 text-center text-destructive">{error}</div>

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">آزمون ثبت شد</h2>
        <p className="mt-3 text-muted-foreground">نتیجه پس از انتشار در اختیار شما قرار می‌گیرد.</p>
        <div className="mt-6 grid grid-cols-4 gap-2 text-sm"><div className="rounded-lg bg-muted p-3"><div>درصد</div><div className="mt-1 font-bold">{submitted.percentage}</div></div><div className="rounded-lg bg-muted p-3"><div>صحیح</div><div className="mt-1 font-bold">{submitted.correctAnswers}</div></div><div className="rounded-lg bg-muted p-3"><div>غلط</div><div className="mt-1 font-bold">{submitted.incorrectAnswers}</div></div><div className="rounded-lg bg-muted p-3"><div>بدون پاسخ</div><div className="mt-1 font-bold">{submitted.unansweredAnswers}</div></div></div>
      </div>
    )
  }

  const answeredCount = allQuestions.filter((item) => answers[item.id]?.optionKey).length
  const markedCount = allQuestions.filter((item) => answers[item.id]?.markedForReview).length
  const unansweredCount = allQuestions.length - answeredCount
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  return (
    <div className="space-y-3">
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3"><div className="font-bold">{section?.title}</div><div className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground dir-ltr">{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</div></div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="rounded-xl border border-border bg-card p-5">
          {question && <><div className="mb-4 text-sm text-muted-foreground">سؤال {questionIndex + 1} از {section.questions.length}</div><div className="mb-5 whitespace-pre-wrap text-lg leading-8">{question.text}</div><div className="space-y-3">{question.options.map((option) => <button key={option.optionKey} onClick={() => saveAnswer(option.optionKey)} className={`w-full rounded-lg border p-4 text-right transition ${answer?.optionKey === option.optionKey ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}><span className="ml-3 inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm">{option.optionKey}</span>{option.text}</button>)}</div><div className="mt-6 flex flex-wrap gap-2"><button onClick={() => saveAnswer(answer?.optionKey || null, !answer?.markedForReview)} className="rounded-lg border border-border px-4 py-2">{answer?.markedForReview ? "لغو علامت مرور" : "علامت برای مرور"}</button><button onClick={goPrevious} className="rounded-lg border border-border px-4 py-2">قبلی</button><button onClick={goNext} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">بعدی</button></div></>}
        </div>

        <aside className="space-y-3"><div className="rounded-xl border border-border bg-card p-4"><div className="mb-3 font-bold">پاسخنامه</div><div className="max-h-[55vh] overflow-y-auto space-y-3">{sections.map((item, sectionNo) => <div key={item.id}><div className="mb-2 text-xs text-muted-foreground">{item.title}</div><div className="grid grid-cols-5 gap-2">{item.questions.map((itemQuestion, itemIndex) => { const itemAnswer = answers[itemQuestion.id]; const isCurrent = sectionIndex === sectionNo && questionIndex === itemIndex; const stateClass = itemAnswer?.optionKey ? itemAnswer.markedForReview ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground" : itemAnswer?.markedForReview ? "border-2 border-amber-500" : "border border-border"; return <button key={itemQuestion.id} onClick={() => moveQuestion(sectionNo, itemIndex)} className={`h-9 rounded-lg text-sm ${stateClass} ${isCurrent ? "ring-2 ring-foreground" : ""}`}>{itemIndex + 1}</button>})}</div></div>)}</div></div><button onClick={() => setConfirmOpen(true)} className="w-full rounded-lg bg-destructive px-4 py-3 font-medium text-destructive-foreground">ثبت نهایی آزمون</button></aside>
      </div>

      {confirmOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-card p-6"><h3 className="text-xl font-bold">ثبت نهایی آزمون؟</h3><div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-muted p-3"><div>پاسخ داده‌شده</div><div className="mt-1 font-bold">{answeredCount}</div></div><div className="rounded-lg bg-muted p-3"><div>بدون پاسخ</div><div className="mt-1 font-bold">{unansweredCount}</div></div><div className="rounded-lg bg-muted p-3"><div>علامت مرور</div><div className="mt-1 font-bold">{markedCount}</div></div></div><div className="mt-5 flex gap-3"><button onClick={submitAttempt} className="flex-1 rounded-lg bg-destructive py-2 font-medium text-destructive-foreground">ثبت نهایی</button><button onClick={() => setConfirmOpen(false)} className="flex-1 rounded-lg bg-muted py-2">بازگشت</button></div></div></div>}
    </div>
  )
}
