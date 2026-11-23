"use client"

import { useCallback, useEffect, useState } from "react"

type Subject = { id: string; name: string; chapters: Array<{ id: string; name: string }> }
type Option = { optionKey: string; text: string; isCorrect: boolean }
type Question = {
  id: string
  text: string
  topic: string | null
  difficulty: "EASY" | "MEDIUM" | "HARD"
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "ARCHIVED"
  subject: { name: string } | null
  chapter: { name: string } | null
  options: Option[]
}
type ImportItem = {
  id: string
  rowNumber: number | null
  sourceText: string | null
  normalized: unknown
  errors: string[]
  warnings: string[]
  duplicate: boolean
}

export default function QuestionBank({ role }: { role: "ADMIN" | "COUNSELOR" }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [search, setSearch] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const [status, setStatus] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openImport, setOpenImport] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    batchId: string
    validCount: number
    failedCount: number
    warningCount: number
    headers?: string[]
    suggestedMapping?: Record<string, string>
    items: ImportItem[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (subjectId) params.set("subjectId", subjectId)
    if (status) params.set("status", status)

    const [questionResponse, subjectResponse] = await Promise.all([
      fetch(`/api/assessments/questions?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/assessments/subjects", { cache: "no-store" })
    ])

    if (questionResponse.ok) {
      const data = await questionResponse.json() as { questions: Question[] }
      setQuestions(data.questions)
    }
    if (subjectResponse.ok) {
      const data = await subjectResponse.json() as { subjects: Subject[] }
      setSubjects(data.subjects)
    }
  }, [search, subjectId, status])

  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load])

  const createQuestion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(event.currentTarget)
    const subjectIdValue = String(form.get("subjectId") || "")
    const optionKeys = ["A", "B", "C", "D"]
    const correctAnswer = String(form.get("correctAnswer") || "")

    const response = await fetch("/api/assessments/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: String(form.get("text") || ""),
        subjectId: subjectIdValue,
        chapterId: String(form.get("chapterId") || "") || undefined,
        topic: String(form.get("topic") || "") || undefined,
        difficulty: String(form.get("difficulty") || "MEDIUM"),
        explanation: String(form.get("explanation") || "") || undefined,
        source: String(form.get("source") || "") || undefined,
        tags: String(form.get("tags") || "").split(/[,،]/).map((tag) => tag.trim()).filter(Boolean),
        options: optionKeys.map((optionKey) => ({
          optionKey,
          text: String(form.get(`option${optionKey}`) || ""),
          isCorrect: optionKey === correctAnswer
        }))
      })
    })

    const data = await response.json() as { error?: string }
    setLoading(false)
    if (!response.ok) {
      setError(data.error || "خطا در ثبت سؤال")
      return
    }

    setOpenCreate(false)
    await load()
  }

  const bulkAction = async (action: "APPROVE" | "ARCHIVE" | "PENDING_REVIEW") => {
    if (selected.length === 0) return
    setLoading(true)
    await fetch("/api/assessments/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIds: selected, action })
    })
    setLoading(false)
    setSelected([])
    await load()
  }

  const saveImportCorrection = async (item: ImportItem) => {
    if (!importPreview) return
    const normalized = item.normalized as {
      text?: string
      subject?: string
      chapter?: string
      topic?: string
      difficulty?: "EASY" | "MEDIUM" | "HARD"
      explanation?: string
      tags?: string[]
      source?: string
      options?: Array<{ optionKey: "A" | "B" | "C" | "D"; text: string }>
      correctAnswer?: "A" | "B" | "C" | "D"
    }

    setLoading(true)
    const response = await fetch("/api/assessments/import", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: importPreview.batchId,
        correction: {
          itemId: item.id,
          text: normalized.text,
          subject: normalized.subject,
          chapter: normalized.chapter,
          topic: normalized.topic,
          difficulty: normalized.difficulty,
          optionA: normalized.options?.find((option) => option.optionKey === "A")?.text,
          optionB: normalized.options?.find((option) => option.optionKey === "B")?.text,
          optionC: normalized.options?.find((option) => option.optionKey === "C")?.text,
          optionD: normalized.options?.find((option) => option.optionKey === "D")?.text,
          correctAnswer: normalized.correctAnswer,
          explanation: normalized.explanation,
          tags: normalized.tags,
          source: normalized.source
        }
      })
    })
    setLoading(false)

    if (response.ok) {
      const data = await response.json() as { errors: string[] }
      setImportPreview((current) => current ? {
        ...current,
        validCount: current.validCount + (data.errors.length === 0 ? 1 : 0),
        failedCount: current.failedCount + (data.errors.length > 0 ? 0 : -1),
        items: current.items.map((currentItem) => currentItem.id === item.id
          ? { ...currentItem, errors: data.errors, sourceText: normalized.text || "", normalized }
          : currentItem)
      } : current)
    }
  }

  const updateImportItem = (itemId: string, field: "text" | "subject" | "chapter" | "topic" | "difficulty" | "optionA" | "optionB" | "optionC" | "optionD" | "correctAnswer" | "explanation" | "source", value: string) => {
    setImportPreview((current) => current ? {
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) return item
        const normalized = item.normalized as Record<string, unknown>
        if (["optionA", "optionB", "optionC", "optionD"].includes(field)) {
          const optionKey = field.replace("option", "") as "A" | "B" | "C" | "D"
          const options = Array.isArray(normalized.options)
            ? normalized.options as Array<{ optionKey: "A" | "B" | "C" | "D"; text: string }>
            : []
          return {
            ...item,
            normalized: {
              ...normalized,
              options: ["A", "B", "C", "D"].map((key) => ({
                optionKey: key as "A" | "B" | "C" | "D",
                text: key === optionKey
                  ? value
                  : options.find((option) => option.optionKey === key)?.text || ""
              }))
            }
          }
        }
        return { ...item, normalized: { ...normalized, [field]: value }, sourceText: field === "text" ? value : item.sourceText }
      })
    } : current)
  }

  const commitImport = async (itemIds?: string[]) => {
    if (!importPreview) return
    setLoading(true)
    const response = await fetch("/api/assessments/import", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: importPreview.batchId, itemIds })
    })
    setLoading(false)
    if (response.ok) {
      setImportPreview(null)
      await load()
    }
  }

  const statusName: Record<Question["status"], string> = {
    DRAFT: "پیش‌نویس",
    PENDING_REVIEW: "در انتظار بررسی",
    APPROVED: "تایید شده",
    ARCHIVED: "بایگانی"
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">بانک سؤال</h2>
          <p className="mt-1 text-sm text-muted-foreground">مدیریت، واردسازی و انتخاب سوالات قابل استفاده در آزمون‌ها</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpenImport(true)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">واردسازی فایل</button>
          <button type="button" onClick={() => setOpenCreate(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">سؤال جدید</button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در متن، موضوع و منبع" className="flex-1 rounded-lg border border-border bg-background px-3 py-2" />
        <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2">
          <option value="">همه درس‌ها</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2">
          <option value="">همه وضعیت‌ها</option>
          <option value="PENDING_REVIEW">در انتظار بررسی</option>
          <option value="APPROVED">تایید شده</option>
          <option value="ARCHIVED">بایگانی</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <span className="px-2 py-1 text-sm">{selected.length} سؤال انتخاب شده</span>
          {role === "ADMIN" && <button onClick={() => bulkAction("APPROVE")} className="rounded-lg border border-border bg-card px-3 py-1 text-sm">تایید</button>}
          <button onClick={() => bulkAction("PENDING_REVIEW")} className="rounded-lg border border-border bg-card px-3 py-1 text-sm">ارسال برای بررسی</button>
          <button onClick={() => bulkAction("ARCHIVE")} className="rounded-lg border border-destructive/30 text-destructive px-3 py-1 text-sm">بایگانی</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-right">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">سؤال</th>
              <th className="px-4 py-3">درس / فصل</th>
              <th className="px-4 py-3">دشواری</th>
              <th className="px-4 py-3">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {questions.map((question) => (
              <tr key={question.id}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(question.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} /></td>
                <td className="max-w-xl px-4 py-3"><div className="line-clamp-2">{question.text}</div></td>
                <td className="px-4 py-3 text-sm">{question.subject?.name || "—"}<br/><span className="text-muted-foreground">{question.chapter?.name || "بدون فصل"}</span></td>
                <td className="px-4 py-3 text-sm">{question.difficulty === "EASY" ? "آسان" : question.difficulty === "HARD" ? "سخت" : "متوسط"}</td>
                <td className="px-4 py-3 text-sm">{statusName[question.status]}</td>
              </tr>
            ))}
            {questions.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">سؤالی یافت نشد.</td></tr>}
          </tbody>
        </table>
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card p-6">
            <h3 className="mb-4 text-xl font-bold">ثبت سؤال جدید</h3>
            {error && <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <form onSubmit={createQuestion} className="space-y-4">
              <textarea name="text" required placeholder="متن سؤال" className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2" />
              <div className="grid gap-3 md:grid-cols-2">
                <select name="subjectId" required className="rounded-lg border border-border bg-background px-3 py-2"><option value="">انتخاب درس</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
                <select name="chapterId" className="rounded-lg border border-border bg-background px-3 py-2"><option value="">بدون فصل</option>{subjects.flatMap((subject) => subject.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{subject.name} — {chapter.name}</option>))}</select>
                <input name="topic" placeholder="موضوع" className="rounded-lg border border-border bg-background px-3 py-2" />
                <select name="difficulty" className="rounded-lg border border-border bg-background px-3 py-2"><option value="MEDIUM">متوسط</option><option value="EASY">آسان</option><option value="HARD">سخت</option></select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {["A", "B", "C", "D"].map((key) => <input key={key} name={`option${key}`} required placeholder={`گزینه ${key}`} className="rounded-lg border border-border bg-background px-3 py-2" />)}
              </div>
              <select name="correctAnswer" required className="rounded-lg border border-border bg-background px-3 py-2"><option value="">گزینه صحیح</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
              <textarea name="explanation" placeholder="توضیح پاسخ" className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2" />
              <div className="grid gap-3 md:grid-cols-2"><input name="tags" placeholder="برچسب‌ها، جدا شده با کاما" className="rounded-lg border border-border bg-background px-3 py-2" /><input name="source" placeholder="منبع" className="rounded-lg border border-border bg-background px-3 py-2" /></div>
              <div className="flex gap-3"><button disabled={loading} className="flex-1 rounded-lg bg-primary py-2 font-medium text-primary-foreground">ثبت سؤال</button><button type="button" onClick={() => setOpenCreate(false)} className="flex-1 rounded-lg bg-muted py-2">انصراف</button></div>
            </form>
          </div>
        </div>
      )}

      {openImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-card p-6">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-bold">مرکز واردسازی</h3><button onClick={() => { setOpenImport(false); setImportPreview(null) }} className="text-muted-foreground">بستن</button></div>
            <div className="mb-4 flex gap-3"><a href="/api/assessments/templates?format=xlsx" className="rounded-lg border border-border px-3 py-2 text-sm">دانلود قالب Excel</a><a href="/api/assessments/templates?format=docx" className="rounded-lg border border-border px-3 py-2 text-sm">دانلود قالب Word</a></div>
            <form onSubmit={async (event) => {
              event.preventDefault()
              const fileInput = event.currentTarget.elements.namedItem("file") as HTMLInputElement
              if (!fileInput.files?.[0]) return
              setLoading(true)
              const formData = new FormData()
              formData.set("file", fileInput.files[0])
              const response = await fetch("/api/assessments/import", { method: "POST", body: formData })
              const data = await response.json()
              setLoading(false)
              if (response.ok) setImportPreview(data)
              else setError(data.error || "خطا در واردسازی")
            }} className="flex gap-3"><input name="file" type="file" accept=".xlsx,.docx" required className="flex-1" /><button disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">پردازش و پیش‌نمایش</button></form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            {importPreview && (
              <div className="mt-5 space-y-3">
                <div className="grid grid-cols-3 gap-3"><div className="rounded-lg border border-border p-3">معتبر: {importPreview.validCount}</div><div className="rounded-lg border border-border p-3">هشدار: {importPreview.warningCount}</div><div className="rounded-lg border border-border p-3">خطا: {importPreview.failedCount}</div></div>
                {(importPreview.headers || []).length > 0 && (
                  <div className="rounded-lg border border-border p-3 text-sm"><div className="mb-2 font-bold">سرستون‌های شناسایی‌شده</div>{(importPreview.headers || []).join(" | ")}</div>
                )}
                <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
                  {importPreview.items.map((item) => {
                    const normalized = item.normalized as {
                      text?: string
                      subject?: string
                      chapter?: string
                      topic?: string
                      difficulty?: "EASY" | "MEDIUM" | "HARD"
                      explanation?: string
                      source?: string
                      options?: Array<{ optionKey: "A" | "B" | "C" | "D"; text: string }>
                      correctAnswer?: "A" | "B" | "C" | "D"
                    }
                    const optionText = (key: "A" | "B" | "C" | "D") => normalized.options?.find((option) => option.optionKey === key)?.text || ""
                    return (
                      <div key={item.id} className="grid gap-2 border-b border-border p-3">
                        <div className="grid gap-2 md:grid-cols-[70px_1fr_150px_150px]">
                          <div className="text-xs text-muted-foreground">ردیف {item.rowNumber}</div>
                          <textarea value={normalized.text || ""} onChange={(event) => updateImportItem(item.id, "text", event.target.value)} className="min-h-16 rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                          <input value={normalized.subject || ""} onChange={(event) => updateImportItem(item.id, "subject", event.target.value)} placeholder="درس" className="rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                          <input value={normalized.chapter || ""} onChange={(event) => updateImportItem(item.id, "chapter", event.target.value)} placeholder="فصل" className="rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                        </div>
                        <div className="grid gap-2 md:grid-cols-4">
                          {(["A", "B", "C", "D"] as const).map((key) => <input key={key} value={optionText(key)} onChange={(event) => updateImportItem(item.id, `option${key}`, event.target.value)} placeholder={`گزینه ${key}`} className="rounded-lg border border-border bg-background px-2 py-1 text-sm" />)}
                        </div>
                        <div className="grid gap-2 md:grid-cols-4">
                          <select value={normalized.correctAnswer || ""} onChange={(event) => updateImportItem(item.id, "correctAnswer", event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-sm"><option value="">پاسخ صحیح</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select>
                          <select value={normalized.difficulty || "MEDIUM"} onChange={(event) => updateImportItem(item.id, "difficulty", event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-sm"><option value="EASY">آسان</option><option value="MEDIUM">متوسط</option><option value="HARD">سخت</option></select>
                          <input value={normalized.topic || ""} onChange={(event) => updateImportItem(item.id, "topic", event.target.value)} placeholder="موضوع" className="rounded-lg border border-border bg-background px-2 py-1 text-sm" />
                          <button type="button" onClick={() => saveImportCorrection(item)} className="rounded-lg border border-border px-2 py-1 text-sm">ذخیره اصلاحات</button>
                        </div>
                        {item.errors.length > 0 && <div className="text-xs text-destructive">{item.errors.join("، ")}</div>}
                        {item.warnings.length > 0 && <div className="text-xs text-amber-700">{item.warnings.join("، ")}</div>}
                        {item.duplicate && <div className="text-xs">ممکن است تکراری باشد.</div>}
                      </div>
                    )
                  })}
                </div>
                <button onClick={() => commitImport()} disabled={loading || importPreview.validCount === 0} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">وارد کردن همه موارد معتبر</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
