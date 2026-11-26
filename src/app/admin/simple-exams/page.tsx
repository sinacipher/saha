"use client"
import { useState, useEffect, useCallback } from "react"

type SimpleExam = { id: string; title: string; questionCount: number; durationMinutes: number }

export default function CreateSimpleExamPage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [duration, setDuration] = useState(60)
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")
  const [exams, setExams] = useState<SimpleExam[]>([])

  const fetchExams = useCallback(async () => {
    const res = await fetch("/api/simple-exams")
    if (res.ok) {
      const data = await res.json()
      setExams(data)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchExams()
  }, [fetchExams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return alert("فایل را انتخاب کنید")
    if (Object.keys(answerKey).length !== questionCount) return alert("لطفاً کلید پاسخ تمام سوالات را وارد کنید")

    setLoading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("title", title)
    formData.append("questionCount", questionCount.toString())
    formData.append("durationMinutes", duration.toString())
    formData.append("answerKeyJson", JSON.stringify(answerKey))

    const res = await fetch("/api/simple-exams", { method: "POST", body: formData })
    setLoading(false)
    
    if (res.ok) {
      setMsg("آزمون با موفقیت ایجاد شد!")
      setTitle(""); setFile(null); setAnswerKey({})
      fetchExams() 
    } else {
      const data = await res.json()
      setMsg(data.error)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <h1 className="text-2xl font-bold mb-4">ایجاد آزمون جدید (آپلود فایل)</h1>
        {msg && <div className="p-3 mb-4 bg-primary/10 text-primary rounded-lg">{msg}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="عنوان آزمون" value={title} onChange={e => setTitle(e.target.value)} className="border p-2 rounded-lg w-full" />
            <input required type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="border p-2 rounded-lg w-full" />
            <input required type="number" placeholder="تعداد سوالات" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="border p-2 rounded-lg w-full" />
            <input required type="number" placeholder="زمان (دقیقه)" value={duration} onChange={e => setDuration(Number(e.target.value))} className="border p-2 rounded-lg w-full" />
          </div>

          <h3 className="font-bold mt-6">تعیین کلید پاسخ (پاسخ صحیح هر سوال)</h3>
          <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
            {Array.from({ length: questionCount }).map((_, i) => {
              const qNum = (i + 1).toString()
              return (
                <div key={i} className="flex flex-col items-center border p-2 rounded bg-muted/20">
                  <span className="text-sm font-bold mb-1">سوال {qNum}</span>
                  <select 
                    value={answerKey[qNum] || ""} 
                    onChange={e => setAnswerKey({ ...answerKey, [qNum]: e.target.value })}
                    className="border p-1 rounded text-sm w-full"
                  >
                    <option value="">-</option>
                    <option value="A">الف</option>
                    <option value="B">ب</option>
                    <option value="C">ج</option>
                    <option value="D">د</option>
                  </select>
                </div>
              )
            })}
          </div>

          <button disabled={loading} className="w-full bg-primary text-white p-3 rounded-lg font-bold">
            {loading ? "در حال ذخیره..." : "ثبت آزمون"}
          </button>
        </form>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-6 mt-8">
        <h3 className="font-bold mb-4 text-lg">آزمون‌های ثبت شده اخیر</h3>
        <div className="grid gap-4">
          {exams.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">هنوز آزمونی ساخته نشده است.</p>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border">
                <div>
                  <span className="font-bold block">{exam.title}</span>
                  <span className="text-sm text-muted-foreground">{exam.questionCount} سوال - {exam.durationMinutes} دقیقه</span>
                </div>
                <div className="flex gap-2">
                  <a href={`/admin/simple-exams/${exam.id}/submissions`} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    نتایج و تصحیح
                  </a>
                  <a href={`/admin/simple-exams/${exam.id}/analytics`} className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                    آمار
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}