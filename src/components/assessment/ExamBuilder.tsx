"use client"

import { useCallback, useEffect, useState } from "react"

type Question = { id: string; text: string; subject: { name: string } | null; difficulty: "EASY" | "MEDIUM" | "HARD" }
type Student = { id: string; fullName: string | null }
type Section = { title: string; durationSeconds: number; questionIds: string[] }
type Assessment = { id: string; title: string; type: "KONKUR_SIMULATION" | "PRACTICE_QUIZ"; status: string; durationSeconds: number; assignments: unknown[] }

export default function ExamBuilder({ role }: { role: "ADMIN" | "COUNSELOR" }) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [title, setTitle] = useState("")
  const [type, setType] = useState<"KONKUR_SIMULATION" | "PRACTICE_QUIZ">("PRACTICE_QUIZ")
  const [durationSeconds, setDurationSeconds] = useState(1800)
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [sections, setSections] = useState<Section[]>([{ title: "بخش اول", durationSeconds: 1800, questionIds: [] }])

  const load = useCallback(async () => {
    const [examResponse, questionResponse, studentResponse] = await Promise.all([
      fetch("/api/assessments/exams", { cache: "no-store" }),
      fetch("/api/assessments/questions?status=APPROVED", { cache: "no-store" }),
      fetch("/api/assessments/students", { cache: "no-store" })
    ])

    if (examResponse.ok) {
      const data = await examResponse.json() as { assessments: Assessment[] }
      setAssessments(data.assessments)
    }
    if (questionResponse.ok) {
      const data = await questionResponse.json() as { questions: Question[] }
      setQuestions(data.questions)
    }
    if (studentResponse.ok) {
      const data = await studentResponse.json() as { students: Student[] }
      setStudents(data.students)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(load, 0)
    return () => clearTimeout(timer)
  }, [load])

  const toggleStudent = (studentId: string) => {
    setStudentIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId])
  }

  const updateSectionQuestions = (sectionIndex: number, questionId: string) => {
    setSections((current) => current.map((section, index) => index === sectionIndex
      ? { ...section, questionIds: section.questionIds.includes(questionId) ? section.questionIds.filter((id) => id !== questionId) : [...section.questionIds, questionId] }
      : section))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(event.currentTarget)
    const response = await fetch("/api/assessments/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: String(form.get("description") || ""),
        instructions: String(form.get("instructions") || ""),
        type,
        durationSeconds,
        maxAttempts: Number(form.get("maxAttempts") || 1),
        startAt: String(form.get("startAt") || "") || undefined,
        endAt: String(form.get("endAt") || "") || undefined,
        resultReleaseAt: String(form.get("resultReleaseAt") || "") || undefined,
        randomizeQuestions: form.has("randomizeQuestions"),
        randomizeOptions: form.has("randomizeOptions"),
        allowNavigation: form.has("allowNavigation"),
        studentIds,
        sections,
        scoring: {
          correctPoints: Number(form.get("correctPoints") || 3),
          incorrectPenalty: Number(form.get("incorrectPenalty") || -1),
          unansweredPoints: Number(form.get("unansweredPoints") || 0),
          roundingPrecision: Number(form.get("roundingPrecision") || 2)
        }
      })
    })

    const data = await response.json() as { error?: string }
    setLoading(false)
    if (!response.ok) {
      setError(data.error || "خطا در ایجاد آزمون")
      return
    }

    setOpen(false)
    await load()
  }

  const changeStatus = async (assessmentId: string, action: "READY" | "SCHEDULE" | "ARCHIVE" | "PUBLISH_RESULTS") => {
    setLoading(true)
    await fetch("/api/assessments/exams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId, action })
    })
    setLoading(false)
    await load()
  }

  const statusName: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    READY: "آماده",
    SCHEDULED: "زمان‌بندی شده",
    IN_PROGRESS: "در حال اجرا",
    SUBMITTED: "ارسال شده",
    RESULTS_PENDING: "منتظر نتایج",
    PUBLISHED: "منتشر شده",
    ARCHIVED: "بایگانی"
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h2 className="text-3xl font-bold">ساخت و مدیریت آزمون</h2><p className="mt-1 text-sm text-muted-foreground">آزمون شبیه‌سازی کنکور و تمرین کوتاه</p></div><button onClick={() => setOpen(true)} className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">آزمون جدید</button></div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-right"><thead className="bg-muted"><tr><th className="px-4 py-3">عنوان</th><th className="px-4 py-3">نوع</th><th className="px-4 py-3">وضعیت</th><th className="px-4 py-3">مدت</th><th className="px-4 py-3">عملیات</th></tr></thead><tbody className="divide-y divide-border">
          {assessments.map((assessment) => <tr key={assessment.id}><td className="px-4 py-3 font-medium">{assessment.title}</td><td className="px-4 py-3">{assessment.type === "KONKUR_SIMULATION" ? "شبیه‌سازی کنکور" : "تمرین"}</td><td className="px-4 py-3">{statusName[assessment.status] || assessment.status}</td><td className="px-4 py-3">{Math.round(assessment.durationSeconds / 60)} دقیقه</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2">{assessment.status === "DRAFT" && <button disabled={loading} onClick={() => changeStatus(assessment.id, "READY")} className="rounded-lg border border-border px-3 py-1 text-sm">آماده</button>}<button disabled={loading} onClick={() => changeStatus(assessment.id, "SCHEDULE")} className="rounded-lg border border-border px-3 py-1 text-sm">زمان‌بندی</button>{role === "ADMIN" && assessment.status !== "ARCHIVED" && <button disabled={loading} onClick={() => changeStatus(assessment.id, "PUBLISH_RESULTS")} className="rounded-lg border border-border px-3 py-1 text-sm">انتشار نتایج</button>}<button disabled={loading} onClick={() => changeStatus(assessment.id, "ARCHIVE")} className="rounded-lg border border-destructive/30 px-3 py-1 text-sm text-destructive">بایگانی</button></div></td></tr>)}
          {assessments.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">آزمونی ثبت نشده است.</td></tr>}
        </tbody></table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-card p-6"><h3 className="mb-4 text-xl font-bold">آزمون جدید</h3>{error && <div className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2"><input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان آزمون" className="rounded-lg border border-border bg-background px-3 py-2" /><select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="rounded-lg border border-border bg-background px-3 py-2"><option value="PRACTICE_QUIZ">تمرین کوتاه</option><option value="KONKUR_SIMULATION">شبیه‌سازی کنکور</option></select></div>
          <textarea name="description" placeholder="توضیح آزمون" className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2" /><textarea name="instructions" placeholder="دستورالعمل دانش‌آموز" className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2" />
          <div className="grid gap-3 md:grid-cols-4"><label className="text-sm">مدت کل (دقیقه)<input type="number" value={Math.round(durationSeconds / 60)} onChange={(event) => setDurationSeconds(Number(event.target.value) * 60)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label><input name="maxAttempts" type="number" min="1" defaultValue="1" placeholder="حداکثر تلاش" className="rounded-lg border border-border bg-background px-3 py-2" /><input name="startAt" type="datetime-local" className="rounded-lg border border-border bg-background px-3 py-2" /><input name="endAt" type="datetime-local" className="rounded-lg border border-border bg-background px-3 py-2" /></div>
          <input name="resultReleaseAt" type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2" />
          <div className="grid gap-3 md:grid-cols-4"><label className="text-sm">امتیاز صحیح<input name="correctPoints" type="number" step="0.25" defaultValue="3" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="text-sm">جریمه غلط<input name="incorrectPenalty" type="number" step="0.25" defaultValue="-1" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="text-sm">امتیاز بدون پاسخ<input name="unansweredPoints" type="number" step="0.25" defaultValue="0" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label><label className="text-sm">دقت گرد کردن<input name="roundingPrecision" type="number" min="0" max="4" defaultValue="2" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" /></label></div>
          <div className="flex flex-wrap gap-4 text-sm"><label><input name="randomizeQuestions" type="checkbox" /> تصادفی‌سازی سوالات</label><label><input name="randomizeOptions" type="checkbox" /> تصادفی‌سازی گزینه‌ها</label><label><input name="allowNavigation" type="checkbox" defaultChecked /> اجازه حرکت آزاد</label></div>

          <div><h4 className="mb-2 font-bold">بخش‌ها و سوالات</h4>{sections.map((section, sectionIndex) => <div key={sectionIndex} className="mb-3 rounded-xl border border-border p-4"><div className="mb-3 grid gap-3 md:grid-cols-2"><input value={section.title} onChange={(event) => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, title: event.target.value } : item))} className="rounded-lg border border-border bg-background px-3 py-2" /><input type="number" value={Math.round(section.durationSeconds / 60)} onChange={(event) => setSections((current) => current.map((item, index) => index === sectionIndex ? { ...item, durationSeconds: Number(event.target.value) * 60 } : item))} className="rounded-lg border border-border bg-background px-3 py-2" /></div><div className="max-h-48 overflow-y-auto space-y-2">{questions.map((question) => <label key={question.id} className="flex gap-2 rounded-lg border border-border p-2 text-sm"><input type="checkbox" checked={section.questionIds.includes(question.id)} onChange={() => updateSectionQuestions(sectionIndex, question.id)} /><span className="line-clamp-2">{question.text}</span></label>)}</div>{sections.length > 1 && <button type="button" onClick={() => setSections((current) => current.filter((_, index) => index !== sectionIndex))} className="mt-3 text-sm text-destructive">حذف بخش</button>}</div>)}<button type="button" onClick={() => setSections((current) => [...current, { title: `بخش ${current.length + 1}`, durationSeconds: 1800, questionIds: [] }])} className="rounded-lg border border-border px-3 py-2 text-sm">افزودن بخش</button></div>

          <div><h4 className="mb-2 font-bold">دانش‌آموزان هدف</h4><div className="max-h-48 overflow-y-auto rounded-lg border border-border p-3">{students.map((student) => <label key={student.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} />{student.fullName || student.id}</label>)}</div></div>
          <div className="flex gap-3"><button disabled={loading} className="flex-1 rounded-lg bg-primary py-2 font-medium text-primary-foreground">ذخیره پیش‌نویس</button><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-muted py-2">انصراف</button></div>
        </form></div></div>
      )}
    </div>
  )
}
