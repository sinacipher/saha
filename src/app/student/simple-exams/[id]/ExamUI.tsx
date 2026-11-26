"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

type Exam = {
  id: string;
  title: string;
  questionCount: number;
  durationMinutes: number;
}

export default function ExamUI({ params, exam }: { params: { id: string }, exam: Exam }) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(exam.durationMinutes * 60)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (auto = false) => {
    if (isSubmitting) return
    if (!auto && !confirm("آیا از ثبت نهایی اطمینان دارید؟")) return
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/simple-exams/${params.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      })
      
      const data = await res.json()

      if (res.ok) {
        router.push(`/student/simple-exams/${params.id}/result`)
      } else {
        alert(data.error || "خطا در ثبت آزمون")
        setIsSubmitting(false)
      }
    } catch {
      alert("خطای شبکه. لطفاً دوباره تلاش کنید.")
      setIsSubmitting(false)
    }
  }, [answers, isSubmitting, params.id, router])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Handle auto-submit safely outside the effect body
  useEffect(() => {
    if (timeLeft === 0 && !isSubmitting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSubmit(true)
    }
  }, [timeLeft, isSubmitting, handleSubmit])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <div className={`text-xl font-bold px-4 py-2 rounded-lg ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-red-50 text-red-600'}`}>
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
        <p className="mb-2">فایل سوالات را دانلود کنید، به آن‌ها پاسخ دهید و در جدول زیر وارد کنید.</p>
        <a href={`/api/simple-exams/${params.id}/file`} className="bg-blue-600 text-white px-6 py-2 rounded-lg inline-block font-bold">
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

      <button 
        onClick={() => handleSubmit()} 
        disabled={isSubmitting || timeLeft === 0} 
        className="w-full bg-green-600 text-white p-4 rounded-xl font-bold text-lg disabled:opacity-50"
      >
        {isSubmitting ? "در حال ثبت..." : timeLeft === 0 ? "زمان به پایان رسیده" : "ثبت نهایی آزمون"}
      </button>
    </div>
  )
}