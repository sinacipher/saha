import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const subjects = await prisma.assessmentSubject.findMany({
    where: { isActive: true },
    include: { chapters: { where: { isActive: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" }
  })

  return NextResponse.json({ subjects })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json() as { name?: string; nameEn?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: "نام درس الزامی است" }, { status: 400 })

  const subject = await prisma.assessmentSubject.upsert({
    where: { name },
    update: { nameEn: body.nameEn?.trim() || null },
    create: { name, nameEn: body.nameEn?.trim() || null }
  })

  return NextResponse.json({ success: true, subject })
}
