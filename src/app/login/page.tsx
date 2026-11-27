"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  LockKeyhole,
  Fingerprint,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { normalizeDigits } from "@/lib/national-id"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [nationalId, setNationalId] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "خطا در ارسال کد ورود")
      }

      setStep(2)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "خطا در ارسال کد تایید")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        nationalId,
        code,
        redirect: false,
      })

      if (result?.error) {
        throw new Error("کد واردشده صحیح نیست یا منقضی شده است.")
      }

      router.replace("/")
      router.refresh()
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "خطا در ورود")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setError("")
    setCode("")
    setStep(1)
  }

  return (
    <main dir="rtl" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GraduationCap className="h-9 w-9" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-primary">ریمو</h1>
          <p className="mt-3 text-sm text-muted-foreground">سامانه هوشمند مشاوره و مدیریت تحصیلی</p>
        </div>

        <Card className="overflow-hidden border-border/80 shadow-card">
          <CardHeader className="space-y-3 px-6 pb-5 pt-7 sm:px-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">{step === 1 ? "ورود کاربران" : "تایید هویت"}</span>
              <div className="flex items-center gap-1.5" aria-label={`مرحله ${step} از ۲`}>
                <span className={`h-1.5 w-7 rounded-full transition-colors ${step === 1 ? "bg-primary" : "bg-primary/25"}`} />
                <span className={`h-1.5 w-7 rounded-full transition-colors ${step === 2 ? "bg-primary" : "bg-muted"}`} />
              </div>
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">
                {step === 1 ? "به ریمو خوش آمدید" : "کد تایید را وارد کنید"}
              </CardTitle>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {step === 1
                  ? "برای ورود امن به حساب کاربری، کد ملی خود را وارد کنید."
                  : "کد پنج‌رقمی ارسال‌شده را وارد کنید تا وارد حساب خود شوید."}
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-7 sm:px-8">
            {error && (
              <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-3.5 text-sm text-danger">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="leading-6">{error}</p>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <Input
                  label="کد ملی"
                  name="nationalId"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  value={nationalId}
                  onChange={(event) => setNationalId(event.target.value)}
                  placeholder="0012345678"
                  dir="ltr"
                  maxLength={10}
                  className="text-left tracking-wider"
                />
                <div className="flex items-start gap-2 rounded-lg bg-surface-sunken p-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-5 text-muted-foreground">اطلاعات شما فقط برای احراز هویت و ورود امن به سامانه استفاده می‌شود.</p>
                </div>
                <Button type="submit" size="lg" isLoading={loading} disabled={loading || !nationalId.trim()} className="h-12 w-full rounded-xl">
                  {loading ? "در حال ارسال کد..." : "دریافت کد ورود"}
                  {!loading && <ArrowLeft className="h-4 w-4" />}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="rounded-xl border border-border bg-surface-sunken p-4">
                  <p className="text-xs text-muted-foreground">کد تایید برای این کد ملی درخواست شده است:</p>
                  <p dir="ltr" className="mt-2 text-center font-mono text-lg font-bold tracking-widest text-foreground">{nationalId}</p>
                </div>
                <Input
                  label="کد تایید ۵ رقمی"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(normalizeDigits(event.target.value).replace(/\D/g, "").slice(0, 5))}
                  placeholder="-----"
                  maxLength={5}
                  dir="ltr"
                  className="h-14 text-center font-mono text-xl tracking-[0.5em]"
                />
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                  <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-5 text-muted-foreground">کد تایید را با دیگران به اشتراک نگذارید.</p>
                </div>
                <Button type="submit" size="lg" isLoading={loading} disabled={loading || code.length !== 5} className="h-12 w-full rounded-xl">
                  {loading ? "در حال بررسی..." : "ورود به حساب کاربری"}
                  {!loading && <ArrowLeft className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" disabled={loading} onClick={handleBack} className="h-11 w-full">
                  <ArrowRight className="h-4 w-4" />
                  تغییر کد ملی
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span>ورود امن به سامانه ریمو</span>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground/70">تمامی حقوق این سامانه محفوظ است.</p>
      </div>
    </main>
  )
}
