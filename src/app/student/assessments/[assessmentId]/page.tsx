import ExamRunner from "./ExamRunner"

export default async function StudentExamPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params
  return <ExamRunner assessmentId={assessmentId} />
}
