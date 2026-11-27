"use client"

import { useState, useEffect, useCallback } from "react"

type SimpleExam = {
  id: string
  title: string
  questionCount: number
  durationMinutes: number
}

export default function CreateSimpleExamPage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [duration, setDuration] = useState(60)
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState("")
  const [exams, setExams] = useState<SimpleExam[]>([])

  const fetchExams = useCallback(async () => {
    try {
      const res = await fetch("/api/simple-exams", {
        cache: "no-store",
      })

      if (!res.ok) {
        setMsg("دریافت لیست آزمون‌ها ناموفق بود.")
        return
      }

      const data = await res.json()
      setExams(data)
    } catch {
      setMsg("خطا در ارتباط با سرور.")
    }
  }, [])

  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  fetchExams()
  }, [fetchExams])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!file) {
      alert("فایل را انتخاب کنید")
      return
    }

    if (!title.trim()) {
      alert("عنوان آزمون را وارد کنید")
      return
    }

    if (questionCount < 1 || duration < 1) {
      alert("تعداد سوالات و زمان آزمون باید بیشتر از صفر باشند.")
      return
    }

    if (Object.keys(answerKey).length !== questionCount) {
      alert("لطفاً کلید پاسخ تمام سوالات را وارد کنید")
      return
    }

    setLoading(true)
    setMsg("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim())
      formData.append("questionCount", questionCount.toString())
      formData.append("durationMinutes", duration.toString())
      formData.append("answerKeyJson", JSON.stringify(answerKey))

      const res = await fetch("/api/simple-exams", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMsg(data.error || "ایجاد آزمون ناموفق بود.")
        return
      }

      setMsg("آزمون با موفقیت ایجاد شد!")
      setTitle("")
      setFile(null)
      setAnswerKey({})

      const fileInput = document.getElementById(
        "exam-file"
      ) as HTMLInputElement | null

      if (fileInput) {
        fileInput.value = ""
      }

      await fetchExams()
    } catch {
      setMsg("خطا در ارتباط با سرور هنگام ایجاد آزمون.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (exam: SimpleExam) => {
    const confirmed = window.confirm(
      `آیا از حذف آزمون «${exam.title}» مطمئن هستید؟\n\nتمام پاسخ‌ها و نتایج ثبت‌شده این آزمون نیز حذف خواهند شد. این عملیات قابل بازگشت نیست.`
    )

    if (!confirmed) return

    setDeletingId(exam.id)
    setMsg("")

    try {
      const res = await fetch(`/api/simple-exams/${exam.id}`, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setMsg(data.error || "حذف آزمون ناموفق بود.")
        return
      }

      setExams((current) =>
        current.filter((item) => item.id !== exam.id)
      )

      setMsg("آزمون و تمام نتایج آن با موفقیت حذف شدند.")
    } catch {
      setMsg("خطا در ارتباط با سرور هنگام حذف آزمون.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h1 className="mb-4 text-2xl font-bold">
          ایجاد آزمون جدید (آپلود فایل)
        </h1>

        {msg && (
          <div
            role="status"
            className="mb-4 rounded-lg bg-primary/10 p-3 text-sm text-primary"
          >
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input
              required
              placeholder="عنوان آزمون"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2"
            />

            <input
              id="exam-file"
              required
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full rounded-lg border border-border bg-background p-2"
            />

            <input
              required
              type="number"
              min={1}
              placeholder="تعداد سوالات"
              value={questionCount}
              onChange={(e) => {
                setQuestionCount(Number(e.target.value))
                setAnswerKey({})
              }}
              className="w-full rounded-lg border border-border bg-background p-2"
            />

            <input
              required
              type="number"
              min={1}
              placeholder="زمان (دقیقه)"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-background p-2"
            />
          </div>

          <h3 className="mt-6 font-bold">
            تعیین کلید پاسخ (پاسخ صحیح هر سوال)
          </h3>

          <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-5">
            {Array.from({ length: Math.max(0, questionCount) }).map(
              (_, index) => {
                const qNum = (index + 1).toString()

                return (
                  <div
                    key={qNum}
                    className="flex flex-col items-center rounded border border-border bg-muted/20 p-2"
                  >
                    <span className="mb-1 text-sm font-bold">
                      سوال {qNum}
                    </span>

                    <select
                      value={answerKey[qNum] || ""}
                      onChange={(e) =>
                        setAnswerKey((current) => ({
                          ...current,
                          [qNum]: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-border bg-background p-1 text-sm"
                    >
                      <option value="">انتخاب</option>
                      <option value="A">الف</option>
                      <option value="B">ب</option>
                      <option value="C">ج</option>
                      <option value="D">د</option>
                    </select>
                  </div>
                )
              }
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary p-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "در حال ذخیره..." : "ثبت آزمون"}
          </button>
        </form>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6">
        <h2 className="mb-4 text-lg font-bold">
          آزمون‌های ثبت شده
        </h2>

        <div className="grid gap-4">
          {exams.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              هنوز آزمونی ساخته نشده است.
            </p>
          ) : (
            exams.map((exam) => (
              <div
                key={exam.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="block break-words font-bold">
                    {exam.title}
                  </span>

                  <span className="text-sm text-muted-foreground">
                    {exam.questionCount} سوال - {exam.durationMinutes} دقیقه
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/admin/simple-exams/${exam.id}/submissions`}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    نتایج و تصحیح
                  </a>

                  <a
                    href={`/admin/simple-exams/${exam.id}/analytics`}
                    className="rounded-lg bg-purple-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-purple-700"
                  >
                    آمار
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(exam)}
                    disabled={deletingId === exam.id}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === exam.id ? "در حال حذف..." : "حذف آزمون"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}