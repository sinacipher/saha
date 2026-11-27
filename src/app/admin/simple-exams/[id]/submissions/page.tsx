import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SimpleExamSubmissionsView from "@/components/simple-exams/SimpleExamSubmissionsView"

export default async function AdminSimpleExamSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/login")

  const { id } = await params
  return (
    <SimpleExamSubmissionsView
      examId={id}
      viewerRole="ADMIN"
      viewerId={session.user.id}
      backHref="/admin/simple-exams"
    />
  )
}
