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
    // Server-side / observability logging only. Never expose to UI.
    console.error("[SAHA Error Boundary]", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg space-y-6">
        <div className="text-6xl">⚠️</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">خطایی رخ داد</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            متأسفانه در پردازش درخواست شما مشکلی پیش آمد. لطفاً دوباره تلاش کنید.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            تلاش مجدد
          </button>
          <Link
            href="/"
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>

        {error.digest && (
          <p className="text-xs text-muted-foreground/60" dir="ltr">
            کد خطا: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}