import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// دریافت لیست آزمون‌ها
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const exams = await prisma.simpleExam.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, description: true, questionCount: true, 
      durationMinutes: true, startAt: true, endAt: true, fileName: true, fileType: true, fileData: true
    }
  })
  return NextResponse.json(exams)
}

// ساخت آزمون جدید (فقط مدیر و مشاور)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const questionCount = parseInt(formData.get("questionCount") as string)
    const durationMinutes = parseInt(formData.get("durationMinutes") as string)
    const startAt = formData.get("startAt") ? new Date(formData.get("startAt") as string) : null
    const endAt = formData.get("endAt") ? new Date(formData.get("endAt") as string) : null
    const answerKeyJson = JSON.parse(formData.get("answerKeyJson") as string)

    if (!file || !title || !questionCount || !durationMinutes) {
      return NextResponse.json({ error: "همه فیلدهای الزامی را پر کنید" }, { status: 400 })
    }

    // تبدیل فایل به Base64 برای ذخیره در دیتابیس (محدودیت ۵ مگابایت)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم فایل نباید بیشتر از ۵ مگابایت باشد" }, { status: 400 })
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString("base64")

    await prisma.simpleExam.create({
      data: {
        title,
        description,
        fileData: base64Data,
        fileName: file.name,
        fileType: file.type,
        questionCount,
        answerKeyJson,
        durationMinutes,
        startAt,
        endAt,
        createdById: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "خطا در ساخت آزمون" }, { status: 500 })
  }
}