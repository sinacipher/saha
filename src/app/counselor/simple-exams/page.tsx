"use client"
import { useState } from "react"

export default function CreateSimpleExamPage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [duration, setDuration] = useState(60)
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState("")

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
    } else {
      const data = await res.json()
      setMsg(data.error)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 bg-card rounded-xl shadow-sm border border-border">
      <h1 className="text-2xl font-bold">ایجاد آزمون جدید (آپلود فایل)</h1>
      {msg && <div className="p-3 bg-primary/10 text-primary rounded-lg">{msg}</div>}
      
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
  )
}