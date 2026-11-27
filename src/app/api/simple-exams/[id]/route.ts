import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: "شناسه آزمون نامعتبر است." }, { status: 400 })

    const result = await prisma.simpleExam.deleteMany({ where: { id } })
    if (result.count === 0) {
      return NextResponse.json({ error: "آزمون موردنظر پیدا نشد." }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "آزمون و تمام پاسخ‌های ثبت‌شده آن حذف شدند.", deletedExamId: id })
  } catch (error) {
    console.error("DELETE_SIMPLE_EXAM_ERROR:", error)
    return NextResponse.json({ error: "خطای سرور هنگام حذف آزمون." }, { status: 500 })
  }
}
