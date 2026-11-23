import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      isActive: true,
      ...(session.user.role === "COUNSELOR" ? {
        studentProfile: { counselorId: session.user.id }
      } : {})
    },
    include: { studentProfile: true },
    orderBy: { fullName: "asc" }
  })

  return NextResponse.json({ students: students.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    nationalId: student.nationalId
  })) })
}
