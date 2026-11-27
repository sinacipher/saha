import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SimpleExamAnalyticsView from "@/components/simple-exams/SimpleExamAnalyticsView"

export default async function AdminSimpleExamAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login")

  const { id } = await params
  return (
    <SimpleExamAnalyticsView
      examId={id}
      viewerRole="ADMIN"
      viewerId={session.user.id}
      backHref="/admin/simple-exams"
    />
  )
}
