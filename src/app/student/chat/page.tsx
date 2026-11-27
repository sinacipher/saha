import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import ChatUI from "@/components/ChatUI"

export const dynamic = "force-dynamic"

export default async function StudentChatPage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") redirect("/login")

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: { counselor: true },
  })

  if (!profile?.counselorId || !profile.counselor) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-3xl flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <h1 className="text-xl font-bold">مشاور تعیین نشده است</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          پس از تعیین مشاور توسط مدیر، امکان گفتگو در این بخش فعال می‌شود.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold">گفتگو با مشاور</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          پیام‌های شما به صورت مستقیم برای مشاور مربوطه ارسال می‌شوند.
        </p>
      </header>
      <ChatUI
        currentUserId={session.user.id}
        receiverId={profile.counselorId}
        receiverName={profile.counselor.fullName || "مشاور"}
      />
    </div>
  )
}
