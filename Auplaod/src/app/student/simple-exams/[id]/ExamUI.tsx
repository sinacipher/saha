"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ExamUI({ params, exam }: { params: { id: string }, exam: any }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (auto = false) => {
    if (isSubmitting) return
    if (!auto && !confirm("آیا از ثبت نهایی اطمینان دارید؟")) return
    setIsSubmitting(true)
    
    const res = await fetch(`/api/simple-exams/${params.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers })
    })
    
    if (res.ok) {
      router.push(`/student/simple-exams/${params.id}/result`)
    } else {
      const data = await res.json()
      alert(data.error || "خطا در ثبت آزمون")
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit(true) 
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [answers]) 

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <div className="text-xl font-bold text-red-600 bg-red-50 px-4 py-2 rounded-lg">
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
        <p className="mb-2">فایل سوالات را دانلود کنید، به آن‌ها پاسخ دهید و در جدول زیر وارد کنید.</p>
        <a href={`data:${exam.fileType};base64,${exam.fileData}`} download={exam.fileName} className="bg-blue-600 text-white px-6 py-2 rounded-lg inline-block font-bold">
          دانلود فایل آزمون
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card p-6 rounded-xl border">
        {Array.from({ length: exam.questionCount }).map((_, i) => {
          const qNum = (i + 1).toString()
          return (
            <div key={i} className="flex flex-col border p-3 rounded-lg bg-muted/10">
              <span className="font-bold mb-2">سوال {qNum}</span>
              <div className="flex gap-2 justify-between">
                {["A", "B", "C", "D"].map(opt => (
                  <label key={opt} className="flex flex-col items-center cursor-pointer">
                    <input 
                      type="radio" 
                      name={`q${qNum}`} 
                      value={opt} 
                      checked={answers[qNum] === opt}
                      onChange={() => setAnswers({ ...answers, [qNum]: opt })}
                      className="mb-1"
                    />
                    <span className="text-sm">{opt === "A" ? "الف" : opt === "B" ? "ب" : opt === "C" ? "ج" : "د"}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={() => handleSubmit()} disabled={isSubmitting} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold text-lg">
        {isSubmitting ? "در حال ثبت..." : "ثبت نهایی آزمون"}
      </button>
    </div>
  )
}