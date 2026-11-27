import { auth } from "@/auth"
import { redirect } from "next/navigation"
import SimpleExamSubmissionsView from "@/components/simple-exams/SimpleExamSubmissionsView"

export default async function CounselorSimpleExamSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COUNSELOR") redirect("/login")

  const { id } = await params
  return (
    <SimpleExamSubmissionsView
      examId={id}
      viewerRole="COUNSELOR"
      viewerId={session.user.id}
      backHref="/counselor/simple-exams"
    />
  )
}
