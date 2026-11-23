import ResultView from "@/components/assessment/ResultView"

export default async function StudentResultPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">نتیجه آزمون</h2>
      <ResultView assessmentId={assessmentId} />
    </div>
  )
}
