"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

type Exam = {
  id: string
  title: string
  questionCount: number
  durationSeconds: number
}

export default function ExamUI({
  params,
  exam,
}: {
  params: { id: string }
  exam: Exam
}) {
  const router = useRouter()

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(exam.durationSeconds)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  const submittedRef = useRef(false)

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submittedRef.current) return

      if (!auto && !confirm("آیا از ثبت نهایی آزمون اطمینان دارید؟")) {
        return
      }

      submittedRef.current = true
      setIsSubmitting(true)
      setMessage(
        auto
          ? "زمان آزمون به پایان رسید. پاسخ‌های شما در حال ثبت خودکار هستند..."
          : "پاسخ‌های شما در حال ثبت هستند..."
      )

      try {
        const res = await fetch(
          `/api/simple-exams/${params.id}/submit`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers,
              autoSubmit: auto,
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          throw new Error(
            data.error || "ثبت پاسخ‌ها با خطا مواجه شد."
          )
        }

        setMessage(
          auto
            ? "زمان آزمون تمام شد و پاسخ‌های شما با موفقیت ثبت شدند."
            : "پاسخ‌های شما با موفقیت ثبت شدند."
        )

        router.replace(
          `/student/simple-exams/${params.id}/result`
        )
      } catch (error) {
        submittedRef.current = false
        setIsSubmitting(false)

        setMessage(
          error instanceof Error
            ? error.message
            : "خطای نامشخص هنگام ثبت پاسخ‌ها."
        )
      }
    },
    [answers, params.id, router]
  )

  useEffect(() => {
    if (timeLeft <= 0 || submittedRef.current) return

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => Math.max(0, previous - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [timeLeft])

  useEffect(() => {
    if (timeLeft === 0 && !submittedRef.current) {
      void handleSubmit(true)
    }
  }, [timeLeft, handleSubmit])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <h1 className="text-xl font-bold">{exam.title}</h1>

        <div
          className={`rounded-lg px-5 py-3 text-xl font-bold ${
            timeLeft <= 60
              ? "animate-pulse bg-red-100 text-red-700"
              : "bg-muted text-foreground"
          }`}
          dir="ltr"
        >
          {formatTime(timeLeft)}
        </div>
      </header>

      {message && (
        <div
          className="rounded-lg border border-border bg-muted p-4 text-sm"
          role="status"
        >
          {message}
        </div>
      )}

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-center text-blue-900">
        <p className="mb-3">
          فایل سؤالات را دانلود کنید و پاسخ‌ها را در فرم زیر وارد کنید.
        </p>

        <a
          href={`/api/simple-exams/${params.id}/file`}
          className="inline-block rounded-lg bg-blue-600 px-6 py-2 font-bold text-white hover:bg-blue-700"
        >
          دانلود فایل آزمون
        </a>
      </section>

      <section className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-4">
        {Array.from(
          { length: exam.questionCount },
          (_, index) => {
            const number = String(index + 1)

            return (
              <div
                key={number}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <p className="mb-3 font-bold">
                  سؤال {number}
                </p>

                <div className="flex justify-between gap-2">
                  {["A", "B", "C", "D"].map((option) => (
                    <label
                      key={option}
                      className={`flex flex-1 cursor-pointer flex-col items-center rounded-lg border p-2 ${
                        answers[number] === option
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${number}`}
                        value={option}
                        checked={answers[number] === option}
                        disabled={isSubmitting}
                        onChange={() =>
                          setAnswers((previous) => ({
                            ...previous,
                            [number]: option,
                          }))
                        }
                      />

                      <span className="mt-1 text-sm">
                        {option === "A"
                          ? "الف"
                          : option === "B"
                            ? "ب"
                            : option === "C"
                              ? "ج"
                              : "د"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          }
        )}
      </section>

      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">
          پاسخ داده‌شده: {Object.keys(answers).length} از{" "}
          {exam.questionCount}
        </p>

        <button
          type="button"
          onClick={() => void handleSubmit(false)}
          disabled={isSubmitting || timeLeft === 0}
          className="w-full rounded-xl bg-green-600 p-4 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "در حال ثبت پاسخ‌ها..."
            : "ثبت نهایی آزمون"}
        </button>
      </div>
    </main>
  )
}