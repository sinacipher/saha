import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ابتدا وارد حساب شوید." },
        { status: 401 },
      )
    }

    const { id } = await params
    const role = session.user.role

    if (!["ADMIN", "COUNSELOR", "STUDENT"].includes(role)) {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز است." },
        { status: 403 },
      )
    }

    const exam = await prisma.simpleExam.findUnique({
      where: { id },
      select: {
        fileData: true,
        fileName: true,
        fileType: true,
        startAt: true,
        endAt: true,
      },
    })

    if (!exam) {
      return NextResponse.json(
        { error: "فایل آزمون پیدا نشد." },
        { status: 404 },
      )
    }

    if (role === "STUDENT") {
      const now = new Date()

      if (exam.startAt && now < exam.startAt) {
        return NextResponse.json(
          { error: "آزمون هنوز شروع نشده است." },
          { status: 403 },
        )
      }

      if (exam.endAt && now > exam.endAt) {
        return NextResponse.json(
          { error: "مهلت این آزمون به پایان رسیده است." },
          { status: 403 },
        )
      }
    }

    const base64 = exam.fileData.includes("base64,")
      ? exam.fileData.split("base64,")[1]
      : exam.fileData

    if (!base64) {
      return NextResponse.json(
        { error: "محتوای فایل آزمون نامعتبر است." },
        { status: 500 },
      )
    }

    const buffer = Buffer.from(base64, "base64")
    const safeFileName = exam.fileName
      .replace(/[\r\n]/g, "_")
      .replace(/["\\]/g, "_")
    const fallbackFileName = safeFileName.replace(/[^\x20-\x7E]/g, "_")

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": exam.fileType || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodeURIComponent(safeFileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("GET_SIMPLE_EXAM_FILE_ERROR:", error)
    return NextResponse.json(
      { error: "خطا هنگام دریافت فایل آزمون." },
      { status: 500 },
    )
  }
}

// Keep deletion on the existing /file endpoint for compatibility.
// Deletion remains restricted to administrators.
export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز است." },
        { status: 403 },
      )
    }

    const { id } = await params
    const result = await prisma.simpleExam.deleteMany({ where: { id } })

    if (result.count === 0) {
      return NextResponse.json(
        { error: "آزمون موردنظر پیدا نشد." },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, deletedExamId: id })
  } catch (error) {
    console.error("DELETE_SIMPLE_EXAM_ERROR:", error)
    return NextResponse.json(
      { error: "خطای سرور هنگام حذف آزمون." },
      { status: 500 },
    )
  }
}
