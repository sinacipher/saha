import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SimpleExamAnalyticsView from "@/components/simple-exams/SimpleExamAnalyticsView"

export default async function CounselorSimpleExamAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COUNSELOR") redirect("/login")

  const { id } = await params
  return (
    <SimpleExamAnalyticsView
      examId={id}
      viewerRole="COUNSELOR"
      viewerId={session.user.id}
      backHref="/counselor/simple-exams"
    />
  )
}
