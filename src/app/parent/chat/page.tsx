import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ChatUI from "@/components/ChatUI"

export const dynamic = "force-dynamic"

export default async function ParentChatPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "PARENT") redirect("/login")

  const profile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      student: {
        include: { counselor: true, user: true },
      },
    },
  })

  const counselor = profile?.student?.counselor

  if (!profile?.student || !counselor) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold">ارتباط مشاور در دسترس نیست</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          برای دانش‌آموز متصل به این حساب، هنوز مشاوری تعیین نشده است.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">گفتگو با مشاور فرزند</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          دانش‌آموز: {profile.student.user.fullName || "بدون نام"}
        </p>
      </header>
      <ChatUI
        currentUserId={session.user.id}
        receiverId={counselor.id}
        receiverName={counselor.fullName || "مشاور"}
      />
    </div>
  )
}
