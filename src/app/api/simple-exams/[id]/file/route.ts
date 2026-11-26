import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Toggle results publishing
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const exam = await prisma.simpleExam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 })

  // Counselors can only edit their own exams
  if (session.user.role === "COUNSELOR" && exam.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.simpleExam.update({
    where: { id },
    data: {
      resultsPublished: body.resultsPublished,
      instructions: body.instructions
    }
  })

  return NextResponse.json({ success: true })
}

// Delete exam
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const exam = await prisma.simpleExam.findUnique({ where: { id } })
  
  if (!exam) return NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 })
  if (session.user.role === "COUNSELOR" && exam.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // The Cascade delete in Prisma will automatically remove attempts
  await prisma.simpleExam.delete({ where: { id } })
  return NextResponse.json({ success: true })
}