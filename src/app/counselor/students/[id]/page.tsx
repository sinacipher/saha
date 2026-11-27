import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import ChatWorkspace, { type ChatContact } from "@/components/chat/ChatWorkspace"

export default async function CounselorStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "COUNSELOR") {
    redirect("/login")
  }

  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      userId: id,
      counselorId: session.user.id,
    },
    include: {
      user: true,
      parents: { include: { user: true } },
    },
  })

  if (!studentProfile) notFound()

  const contacts: ChatContact[] = [
    {
      id: studentProfile.userId,
      name: studentProfile.user.fullName || "دانش‌آموز",
      role: "دانش‌آموز",
    },
    ...studentProfile.parents.map((parent) => ({
      id: parent.userId,
      name: parent.user.fullName || "والد",
      role: "والدین دانش‌آموز",
    })),
  ]

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">پروفایل دانش‌آموز</p>
        <h1 className="mt-1 text-2xl font-bold">
          {studentProfile.user.fullName || "دانش‌آموز"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          از این بخش می‌توانید با دانش‌آموز یا والدین متصل به او گفتگو کنید.
        </p>
      </header>

      <ChatWorkspace
        currentUserId={session.user.id}
        title="ارتباط با خانواده"
        contacts={contacts}
        initialReceiverId={studentProfile.userId}
      />
    </div>
  )
}
