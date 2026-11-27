import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 4 * 1024 * 1024
const MAX_INSTRUCTIONS_LENGTH = 4000
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

function getStudentExamFilter(now: Date): Prisma.SimpleExamWhereInput {
  return {
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ابتدا وارد حساب شوید." },
        { status: 401 },
      )
    }

    let where: Prisma.SimpleExamWhereInput

    if (session.user.role === "ADMIN" || session.user.role === "COUNSELOR") {
      // Counselors must also see exams created by administrators and other counselors.
      where = {}
    } else if (session.user.role === "STUDENT") {
      where = getStudentExamFilter(new Date())
    } else {
      return NextResponse.json(
        { error: "دسترسی غیرمجاز است." },
        { status: 403 },
      )
    }

    const exams = await prisma.simpleExam.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        instructions: true,
        questionCount: true,
        durationMinutes: true,
        startAt: true,
        endAt: true,
        fileName: true,
        fileType: true,
        createdAt: true,
      },
    })

    return NextResponse.json(exams, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    })
  } catch (error) {
    console.error("GET /api/simple-exams:", error)
    return NextResponse.json(
      { error: "دریافت آزمون‌ها با خطا مواجه شد." },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (
      !session?.user?.id ||
      !["ADMIN", "COUNSELOR"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { error: "شما اجازه ایجاد آزمون ندارید." },
        { status: 403 },
      )
    }

    const formData = await request.formData()
    const title = String(formData.get("title") || "").trim()
    const instructions = String(formData.get("instructions") || "").trim()
    const questionCount = Number(formData.get("questionCount"))
    const durationMinutes = Number(formData.get("durationMinutes"))
    const answerKeyRaw = String(formData.get("answerKeyJson") || "")
    const file = formData.get("file")

    if (!title) {
      return NextResponse.json(
        { error: "عنوان آزمون الزامی است." },
        { status: 400 },
      )
    }

    if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return NextResponse.json(
        { error: `متن راهنمای آزمون نباید بیشتر از ${MAX_INSTRUCTIONS_LENGTH} نویسه باشد.` },
        { status: 400 },
      )
    }

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 300
    ) {
      return NextResponse.json(
        { error: "تعداد سوالات باید بین ۱ تا ۳۰۰ باشد." },
        { status: 400 },
      )
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 600
    ) {
      return NextResponse.json(
        { error: "مدت آزمون باید بین ۱ تا ۶۰۰ دقیقه باشد." },
        { status: 400 },
      )
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "فایل آزمون را انتخاب کنید." },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "حجم فایل نباید بیشتر از ۴ مگابایت باشد." },
        { status: 400 },
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "فرمت فایل مجاز نیست. PDF، JPG، PNG یا WEBP انتخاب کنید." },
        { status: 400 },
      )
    }

    let answerKey: Record<string, string>

    try {
      answerKey = JSON.parse(answerKeyRaw) as Record<string, string>
    } catch {
      return NextResponse.json(
        { error: "فرمت کلید پاسخ نامعتبر است." },
        { status: 400 },
      )
    }

    if (
      !answerKey ||
      typeof answerKey !== "object" ||
      Array.isArray(answerKey)
    ) {
      return NextResponse.json(
        { error: "کلید پاسخ نامعتبر است." },
        { status: 400 },
      )
    }

    for (let questionNumber = 1; questionNumber <= questionCount; questionNumber++) {
      const answer = answerKey[String(questionNumber)]

      if (!["A", "B", "C", "D"].includes(answer)) {
        return NextResponse.json(
          { error: `پاسخ صحیح سوال ${questionNumber} را مشخص کنید.` },
          { status: 400 },
        )
      }
    }

    if (Object.keys(answerKey).length !== questionCount) {
      return NextResponse.json(
        { error: "تعداد پاسخ‌های کلید با تعداد سوالات مطابقت ندارد." },
        { status: 400 },
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileData = `data:${file.type};base64,${fileBuffer.toString("base64")}`

    const exam = await prisma.simpleExam.create({
      data: {
        title,
        description: instructions || null,
        instructions: instructions || null,
        fileData,
        fileName: file.name,
        fileType: file.type,
        questionCount,
        answerKeyJson: answerKey,
        durationMinutes,
        createdById: session.user.id,
      },
      select: {
        id: true,
        title: true,
        instructions: true,
        questionCount: true,
        durationMinutes: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: "آزمون با موفقیت ایجاد شد.",
        exam,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("POST /api/simple-exams:", error)
    return NextResponse.json(
      { error: "ایجاد آزمون با خطای سرور مواجه شد." },
      { status: 500 },
    )
  }
}
