import ResultView from "@/components/assessment/ResultView"

export default function StudentResultsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">تاریخچه نتایج</h2><a href="/api/assessments/exports?format=xlsx&type=results" className="rounded-lg border border-border px-4 py-2 text-sm">خروجی نتایج</a></div>
      <ResultView />
    </div>
  )
}
