import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg space-y-6">
        <div className="text-7xl font-bold text-primary/20">۴۰۴</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">صفحه پیدا نشد</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            آدرسی که به دنبال آن هستید وجود ندارد یا منتقل شده است.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  )
}