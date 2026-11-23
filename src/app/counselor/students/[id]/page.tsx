import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ChatUI from "./ChatUI"
import { redirect } from "next/navigation"

export default async function StudentChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")

  // اطلاعات دانش‌آموز و والدینش
  const student = await prisma.user.findUnique({
    where: { id },
    include: { 
      studentProfile: { 
        include: { parents: { include: { user: true } } } 
      } 
    }
  })

  if (!student || student.role !== "STUDENT") redirect("/counselor")

  const parents = student.studentProfile?.parents || []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">اتاق گفتگو</h2>
      <ChatUI 
        counselorId={session.user.id} 
        student={student} 
        parents={parents} 
      />
    </div>
  )
}