import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ChatUI from "@/components/ChatUI"

export default async function ParentChatPage() {
  const session = await auth()
  if (!session || session.user.role !== "PARENT") redirect("/login")

  // پیدا کردن دانش‌آموز و مشاور او
  const profile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: { student: { include: { counselor: true } } }
  })

  const counselor = profile?.student?.counselor

  if (!counselor) {
    return <div className="p-10 text-center text-muted-foreground">هنوز مشاوری برای فرزند شما تعیین نشده است.</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">چت با مشاور</h1>
      <ChatUI 
        currentUserId={session.user.id} 
        receiverId={counselor.id} 
        receiverName={counselor.fullName || "مشاور"} 
      />
    </div>
  )
}