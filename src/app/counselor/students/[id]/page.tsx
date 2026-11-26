import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import ChatUI from "@/components/ChatUI"

export default async function CounselorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session || session.user.role !== "COUNSELOR") redirect("/login")

  // SECURITY CHECK: Verify the student is assigned to this counselor
  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      userId: id,
      counselorId: session.user.id // Enforces ownership
    },
    include: { user: true, parents: { include: { user: true } } }
  })

  // If not found or not assigned, return 404 to hide existence
  if (!studentProfile) notFound()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">پروفایل دانش‌آموز: {studentProfile.user.fullName}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="font-bold mb-4">چت با دانش‌آموز</h3>
          <ChatUI 
            currentUserId={session.user.id} 
            receiverId={studentProfile.userId} 
            receiverName={studentProfile.user.fullName || "دانش‌آموز"} 
          />
        </div>
      </div>
    </div>
  )
}