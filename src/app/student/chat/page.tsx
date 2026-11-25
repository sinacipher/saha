import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ChatUI from "@/components/ChatUI"

export default async function StudentChatPage() {
  const session = await auth()
  if (!session || session.user.role !== "STUDENT") redirect("/login")

  // پیدا کردن مشاور دانش‌آموز
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { counselor: true }
  })

  if (!profile?.counselorId) {
    return <div className="p-10 text-center text-muted-foreground">هنوز مشاوری برای شما تعیین نشده است.</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">چت با مشاور</h1>
      <ChatUI 
        currentUserId={session.user.id} 
        receiverId={profile.counselorId} 
        receiverName={profile.counselor?.fullName || "مشاور"} 
      />
    </div>
  )
}