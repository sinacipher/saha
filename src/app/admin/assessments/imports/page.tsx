"use client"

import { useEffect, useState } from "react"

type ImportBatch = {
  id: string
  originalName: string
  format: string
  status: string
  totalFound: number
  successfulCount: number
  failedCount: number
  warningCount: number
  importingUserName: string
  createdAt: string
}

export default function ImportHistoryPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch("/api/assessments/imports", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json() as { batches: ImportBatch[] }
        setBatches(data.batches)
      }
      setLoading(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-3xl font-bold">تاریخچه واردسازی</h2><a href="/api/assessments/exports?format=xlsx&type=questions" className="rounded-lg border border-border px-4 py-2 text-sm">خروجی سوالات</a></div>
      {loading && <p className="text-muted-foreground">در حال بارگذاری...</p>}
      {!loading && batches.length === 0 && <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">واردسازی وجود ندارد.</div>}
      {batches.length > 0 && <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-right"><thead className="bg-muted"><tr><th className="px-4 py-3">فایل</th><th className="px-4 py-3">کاربر</th><th className="px-4 py-3">وضعیت</th><th className="px-4 py-3">کل</th><th className="px-4 py-3">موفق</th><th className="px-4 py-3">خطا</th><th className="px-4 py-3">هشدار</th><th className="px-4 py-3">تاریخ</th></tr></thead><tbody className="divide-y divide-border">{batches.map((batch) => <tr key={batch.id}><td className="px-4 py-3">{batch.originalName}<div className="text-xs text-muted-foreground">{batch.format}</div></td><td className="px-4 py-3">{batch.importingUserName}</td><td className="px-4 py-3">{batch.status}</td><td className="px-4 py-3">{batch.totalFound}</td><td className="px-4 py-3 text-green-600">{batch.successfulCount}</td><td className="px-4 py-3 text-destructive">{batch.failedCount}</td><td className="px-4 py-3 text-amber-700">{batch.warningCount}</td><td className="px-4 py-3 text-xs dir-ltr">{new Date(batch.createdAt).toLocaleString("fa-IR")}</td></tr>)}</tbody></table></div>}
    </div>
  )
}
