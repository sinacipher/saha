import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import StudentChatUI from "./ChatUI"

export default async function StudentPage() {
  const session = await auth()

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      counselor: true
    }
  })

  if (!profile) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
        پروفایل دانش‌آموز یافت نشد.
      </div>
    )
  }

  if (!profile.counselor) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
        هنوز مشاوری به این حساب اختصاص داده نشده است.
      </div>
    )
  }

  const counselorId = profile.counselorId
  if (!counselorId) redirect("/student")

  const unreadCount = await prisma.message.count({
    where: {
      readAt: null,
      senderId: counselorId,
      chat: {
        counselorId,
        studentId: session.user.id
      }
    }
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">اتاق گفتگو</h2>
      <StudentChatUI
        studentId={session.user.id}
        counselorName={profile.counselor.fullName || "مشاور"}
        unreadCount={unreadCount}
      />
    </div>
  )
}
