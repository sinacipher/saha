"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[REMO Error Boundary]", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-600">!</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">خطایی رخ داد</h1>
          <p className="text-sm leading-7 text-muted-foreground">در پردازش درخواست مشکلی پیش آمد. می‌توانید دوباره تلاش کنید.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={reset} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary-600">تلاش مجدد</button>
          <Link href="/" className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium transition hover:bg-muted">بازگشت به پنل</Link>
        </div>
        {error.digest && <p className="text-xs text-muted-foreground/60" dir="ltr">کد خطا: {error.digest}</p>}
      </div>
    </div>
  )
}
