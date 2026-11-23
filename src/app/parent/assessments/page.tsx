import ResultView from "@/components/assessment/ResultView"

export default function ParentAssessmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">نتایج فرزند</h2><a href="/api/assessments/exports?format=xlsx&type=results" className="rounded-lg border border-border px-4 py-2 text-sm">خروجی نتایج</a></div>
      <p className="text-sm text-muted-foreground">فقط نتایج منتشر‌شده نمایش داده می‌شود.</p>
      <ResultView />
    </div>
  )
}
