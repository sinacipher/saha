"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useFeedback } from "@/components/feedback/FeedbackProvider"
import {
  FilePlus2,
  Trash2,
  ChartNoAxesCombined,
  ClipboardList,
  Loader2,
} from "lucide-react"

type SimpleExam = {
  id: string
  title: string
  questionCount: number
  durationMinutes: number
}

export default function CreateSimpleExamPage() {
  const { notify, confirmAction } = useFeedback()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [duration, setDuration] = useState(60)
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingExams, setLoadingExams] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [exams, setExams] = useState<SimpleExam[]>([])

  const fetchExams = useCallback(async () => {
    try {
      setLoadError("")

      const res = await fetch("/api/simple-exams", {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          data?.error || "دریافت لیست آزمون‌ها ناموفق بود."
        )
      }

      if (!Array.isArray(data)) {
        throw new Error("پاسخ سرور برای فهرست آزمون‌ها معتبر نیست.")
      }

      setExams(data)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "خطا در ارتباط با سرور."

      setLoadError(message)

      notify({
        title: "خطا در دریافت آزمون‌ها",
        description: message,
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

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    if (!title.trim()) {
      notify({
        title: "عنوان آزمون وارد نشده است",
        description: "برای آزمون یک عنوان مشخص وارد کنید.",
        variant: "warning",
      })
      return
    }

    if (!file) {
      notify({
        title: "فایل آزمون انتخاب نشده است",
        description: "فایل PDF یا تصویر سوالات را انتخاب کنید.",
        variant: "warning",
      })
      return
    }

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 300
    ) {
      notify({
        title: "تعداد سوالات نامعتبر است",
        description: "تعداد سوالات باید بین ۱ تا ۳۰۰ باشد.",
        variant: "warning",
      })
      return
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 600
    ) {
      notify({
        title: "زمان آزمون نامعتبر است",
        description: "مدت آزمون باید بین ۱ تا ۶۰۰ دقیقه باشد.",
        variant: "warning",
      })
      return
    }

    if (Object.keys(answerKey).length !== questionCount) {
      notify({
        title: "کلید پاسخ کامل نیست",
        description: "برای تمام سوالات گزینه صحیح را مشخص کنید.",
        variant: "warning",
      })
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()

      formData.append("file", file)
      formData.append("title", title.trim())
      formData.append("questionCount", String(questionCount))
      formData.append("durationMinutes", String(duration))
      formData.append("answerKeyJson", JSON.stringify(answerKey))

      const res = await fetch("/api/simple-exams", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          data?.error || "ایجاد آزمون ناموفق بود."
        )
      }

      setTitle("")
      setFile(null)
      setQuestionCount(10)
      setDuration(60)
      setAnswerKey({})

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      notify({
        title: "آزمون با موفقیت ایجاد شد",
        description: "آزمون و کلید پاسخ آن ذخیره شدند.",
        variant: "success",
      })

      await fetchExams()
    } catch (error) {
      notify({
        title: "ایجاد آزمون ناموفق بود",
        description:
          error instanceof Error
            ? error.message
            : "خطای نامشخص هنگام ایجاد آزمون.",
        variant: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (exam: SimpleExam) => {
    const accepted = await confirmAction({
      title: "حذف دائمی آزمون",
      description:
        `آیا از حذف آزمون «${exam.title}» مطمئن هستید؟\n\n` +
        "تمام پاسخ‌ها، شرکت‌کنندگان و نتایج ثبت‌شده این آزمون نیز حذف خواهند شد.\n" +
        "این عملیات قابل بازگشت نیست.",
      confirmLabel: "حذف دائمی آزمون",
      cancelLabel: "انصراف",
      danger: true,
    })

    if (!accepted) return

    setDeletingId(exam.id)

    try {
      const res = await fetch(`/api/simple-exams/${exam.id}`, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(
          data?.error || "حذف آزمون ناموفق بود."
        )
      }

      setExams((current) =>
        current.filter((item) => item.id !== exam.id)
      )

      notify({
        title: "آزمون حذف شد",
        description: "آزمون و تمام نتایج مرتبط با آن حذف شدند.",
        variant: "success",
      })
    } catch (error) {
      notify({
        title: "حذف آزمون ناموفق بود",
        description:
          error instanceof Error
            ? error.message
            : "خطا در ارتباط با سرور.",
        variant: "error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">
          مدیریت آزمون‌های تشریحی و تستی
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ساخت آزمون، تعیین کلید پاسخ و مدیریت نتایج دانش‌آموزان
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm md:p-7">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <FilePlus2 className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold">ایجاد آزمون جدید</h2>
            <p className="text-sm text-muted-foreground">
              فایل سوالات و پاسخ صحیح هر سوال را ثبت کنید.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold">
                عنوان آزمون
              </label>

              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثلاً آزمون آزمایشی فصل اول"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">
                فایل سوالات
              </label>

              <input
                ref={fileInputRef}
                required
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setFile(event.target.files?.[0] ?? null)
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-bold file:text-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">
                تعداد سوالات
              </label>

              <input
                required
                type="number"
                min={1}
                max={300}
                value={questionCount}
                onChange={(event) => {
                  setQuestionCount(Number(event.target.value))
                  setAnswerKey({})
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">
                مدت آزمون (دقیقه)
              </label>

              <input
                required
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(event) =>
                  setDuration(Number(event.target.value))
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <h3 className="font-bold">کلید پاسخ آزمون</h3>

              <span className="text-sm text-muted-foreground">
                {Object.keys(answerKey).length} از {questionCount} سوال تکمیل شده
              </span>
            </div>

            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-4 md:grid-cols-5">
              {Array.from(
                { length: Math.max(0, Math.min(questionCount, 300)) },
                (_, index) => {
                  const questionNumber = String(index + 1)

                  return (
                    <div
                      key={questionNumber}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <label className="mb-2 block text-center text-sm font-bold">
                        سوال {questionNumber}
                      </label>

                      <select
                        value={answerKey[questionNumber] || ""}
                        onChange={(event) =>
                          setAnswerKey((current) => ({
                            ...current,
                            [questionNumber]: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="">انتخاب پاسخ</option>
                        <option value="A">الف (A)</option>
                        <option value="B">ب (B)</option>
                        <option value="C">ج (C)</option>
                        <option value="D">د (D)</option>
                      </select>
                    </div>
                  )
                }
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                در حال ذخیره آزمون...
              </>
            ) : (
              "ایجاد و ذخیره آزمون"
            )}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">آزمون‌های ثبت‌شده</h2>

          <span className="rounded-full bg-muted px-3 py-1 text-sm font-bold">
            {exams.length} آزمون
          </span>
        </div>

        {loadingExams ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
            در حال دریافت آزمون‌ها...
          </div>
        ) : loadError && exams.length === 0 ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="font-bold text-red-600">{loadError}</p>

            <button
              type="button"
              onClick={() => void fetchExams()}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-bold transition hover:bg-muted"
            >
              تلاش مجدد
            </button>
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-bold">هنوز آزمونی ایجاد نشده است.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              اولین آزمون را از فرم بالا ایجاد کنید.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((exam) => (
              <article
                key={exam.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <h3 className="break-words font-bold">
                    {exam.title}
                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {exam.questionCount} سوال
                    <span className="mx-2">·</span>
                    {exam.durationMinutes} دقیقه
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/admin/simple-exams/${exam.id}/submissions`}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    <ClipboardList className="h-4 w-4" />
                    نتایج
                  </a>

                  <a
                    href={`/admin/simple-exams/${exam.id}/analytics`}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    <ChartNoAxesCombined className="h-4 w-4" />
                    آمار
                  </a>

                  <button
                    type="button"
                    onClick={() => void handleDelete(exam)}
                    disabled={deletingId === exam.id}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === exam.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    {deletingId === exam.id ? "در حال حذف" : "حذف"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}