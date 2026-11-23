import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const format = new URL(request.url).searchParams.get("format")
  const type = new URL(request.url).searchParams.get("type")

  if (format !== "xlsx") {
    return NextResponse.json({ error: "فقط export xlsx پشتیبانی می‌شود" }, { status: 400 })
  }

  if (type === "questions") {
    if (!["ADMIN", "COUNSELOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const questions = await prisma.question.findMany({
      where: session.user.role === "COUNSELOR"
        ? { OR: [{ authorId: session.user.id }, { status: "APPROVED" }] }
        : {},
      include: {
        subject: true,
        chapter: true,
        options: { orderBy: { position: "asc" } }
      },
      orderBy: { updatedAt: "desc" }
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "سحا"
    const sheet = workbook.addWorksheet("Questions")
    sheet.addRow(["Question ID", "Subject", "Chapter", "Topic", "Difficulty", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Explanation", "Tags", "Source"])

    for (const question of questions) {
      const options = new Map(question.options.map((option) => [option.optionKey, option]))
      const correct = question.options.find((option) => option.isCorrect)?.optionKey || ""
      sheet.addRow([
        question.externalId || question.id,
        question.subject?.name || "",
        question.chapter?.name || "",
        question.topic || "",
        question.difficulty,
        question.text,
        options.get("A")?.text || "",
        options.get("B")?.text || "",
        options.get("C")?.text || "",
        options.get("D")?.text || "",
        correct,
        question.explanation || "",
        (question.tagsJson as string[]).join(", "),
        question.source || ""
      ])
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=saha-questions.xlsx"
      }
    })
  }

  if (type === "results") {
    let studentIds: string[] | null = null

    if (session.user.role === "STUDENT") {
      studentIds = [session.user.id]
    } else if (session.user.role === "PARENT") {
      const profile = await prisma.parentProfile.findUnique({
        where: { userId: session.user.id },
        include: { student: true }
      })
      studentIds = profile?.student?.userId ? [profile.student.userId] : []
    } else if (session.user.role === "COUNSELOR") {
      const profiles = await prisma.studentProfile.findMany({
        where: { counselorId: session.user.id },
        select: { userId: true }
      })
      studentIds = profiles.map((profile) => profile.userId)
    } else if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const results = await prisma.assessmentResult.findMany({
      where: {
        published: true,
        ...(studentIds ? { studentId: { in: studentIds } } : {})
      },
      include: {
        assessment: { select: { title: true } },
        attempt: { select: { submittedAt: true, timeSpentSeconds: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    const users = await prisma.user.findMany({
      where: { id: { in: results.map((result) => result.studentId) } },
      select: { id: true, fullName: true }
    })
    const nameMap = new Map(users.map((user) => [user.id, user.fullName]))

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "سحا"
    const sheet = workbook.addWorksheet("Results")
    sheet.addRow(["Student", "Assessment", "Submitted At", "Percentage", "Correct", "Incorrect", "Unanswered", "Raw Score", "Time Spent (Seconds)"])

    for (const result of results) {
      sheet.addRow([
        nameMap.get(result.studentId) || result.studentId,
        result.assessment.title,
        result.attempt.submittedAt?.toISOString() || "",
        result.percentage,
        result.correctAnswers,
        result.incorrectAnswers,
        result.unansweredAnswers,
        result.rawScore,
        result.attempt.timeSpentSeconds
      ])
    }

    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=saha-results.xlsx"
      }
    })
  }

  return NextResponse.json({ error: "نوع export نامعتبر است" }, { status: 400 })
}
