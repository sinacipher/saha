import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json() as { subjectId?: string; name?: string; nameEn?: string }
  if (!body.subjectId || !body.name?.trim()) {
    return NextResponse.json({ error: "درس و فصل الزامی است" }, { status: 400 })
  }

  const chapter = await prisma.assessmentChapter.upsert({
    where: {
      subjectId_name: { subjectId: body.subjectId, name: body.name.trim() }
    },
    update: { nameEn: body.nameEn?.trim() || null },
    create: {
      subjectId: body.subjectId,
      name: body.name.trim(),
      nameEn: body.nameEn?.trim() || null
    }
  })

  return NextResponse.json({ success: true, chapter })
}
