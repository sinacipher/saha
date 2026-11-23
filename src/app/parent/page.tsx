import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ParentChatUI from "./ChatUI"

export default async function ParentPage() {
  const session = await auth()

  if (!session || session.user.role !== "PARENT") {
    redirect("/login")
  }

  const profile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      student: { include: { counselor: true, user: true } },
      user: true
    }
  })

  if (!profile?.student?.counselor) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
        برای دانش‌آموز مربوط به این حساب مشاوری تعیین نشده است.
      </div>
    )
  }

  const counselorId = profile.student.counselorId
  if (!counselorId) redirect("/parent")

  const unreadCount = await prisma.message.count({
    where: {
      readAt: null,
      senderId: counselorId,
      chat: {
        counselorId,
        parentId: session.user.id
      }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">اتاق گفتگو</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          دانش‌آموز: {profile.student.user.fullName || "بدون نام"}
        </p>
      </div>
      <ParentChatUI
        parentId={session.user.id}
        counselorName={profile.student.counselor.fullName || "مشاور"}
        unreadCount={unreadCount}
      />
    </div>
  )
}
