import { auth } from "@/auth"
import { finalizeSimpleExamAttempt } from "@/lib/simple-exam-attempt"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 })
  }

  const { id: examId } = await params
  let autoSubmit = false

  try {
    const body: unknown = await request.json()
    if (body && typeof body === "object" && !Array.isArray(body)) {
      autoSubmit = (body as { autoSubmit?: unknown }).autoSubmit === true
    }
  } catch {
    // An empty request is valid. The database is the source of truth for answers.
  }

  try {
    // Manual submission may happen before the deadline. Automatic submission may not.
    const result = await finalizeSimpleExamAttempt(
      examId,
      session.user.id,
      !autoSubmit,
    )

    if (result.status === "NOT_FOUND") {
      return NextResponse.json({ error: "تلاش فعالی برای این آزمون پیدا نشد." }, { status: 404 })
    }

    if (result.status === "NOT_DUE") {
      return NextResponse.json(
        { error: "هنوز زمان آزمون به پایان نرسیده است.", code: "NOT_DUE" },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      attemptId: result.attemptId,
      percentage: result.percentage,
      autoSubmitted: autoSubmit,
      alreadySubmitted: result.alreadySubmitted,
    })
  } catch (error) {
    console.error("SIMPLE_EXAM_SUBMIT_ERROR:", error)
    return NextResponse.json({ error: "خطای سرور هنگام ثبت پاسخ‌های آزمون." }, { status: 500 })
  }
}
