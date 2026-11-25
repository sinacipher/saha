"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [nationalId, setNationalId] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "خطا در ارسال کد")
      }

      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ارسال کد تایید")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        nationalId,
        code,
        redirect: false,
      })

      if (res?.error) {
        throw new Error("کد وارد شده صحیح نیست یا منقضی شده است")
      }

      // در صورت موفقیت، فعلاً به صفحه اصلی هدایت می‌شود (بعداً بر اساس نقش هدایت می‌کنیم)
      router.push("/")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در ورود")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-lg border border-border">
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">سحا</h1>
          <p className="text-muted-foreground">ورود به سیستم مشاوره کنکور</p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">کد ملی</label>
              <input
                type="text"
                required
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none text-left dir-ltr"
                placeholder="0012345678"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? "در حال ارسال..." : "دریافت کد ورود"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">کد تایید ۵ رقمی</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none text-center tracking-widest text-lg dir-ltr"
                placeholder="-----"
                maxLength={5}
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                کد ارسال شده را از ترمینال VS Code کپی کنید
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {loading ? "در حال بررسی..." : "ورود به سحا"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-muted-foreground hover:text-primary transition mt-2"
            >
              بازگشت
            </button>
          </form>
        )}
      </div>
    </div>
  )
}