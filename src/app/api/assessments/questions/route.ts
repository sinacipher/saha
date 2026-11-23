import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Difficulty, QuestionStatus } from "@prisma/client"
import { NextResponse } from "next/server"

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim()
  const subjectId = searchParams.get("subjectId") || undefined
  const status = searchParams.get("status") as QuestionStatus | null
  const difficulty = searchParams.get("difficulty") as Difficulty | null

  const questions = await prisma.question.findMany({
    where: {
      ...(session.user.role === "COUNSELOR" ? {
        OR: [{ authorId: session.user.id }, { status: "APPROVED" }]
      } : {}),
      ...(search ? {
        OR: [
          { text: { contains: search, mode: "insensitive" } },
          { topic: { contains: search, mode: "insensitive" } },
          { source: { contains: search, mode: "insensitive" } }
        ]
      } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(status ? { status } : {}),
      ...(difficulty ? { difficulty } : {})
    },
    include: {
      subject: true,
      chapter: true,
      passage: true,
      options: { orderBy: { position: "asc" } },
      author: { select: { id: true, fullName: true } }
    },
    orderBy: { updatedAt: "desc" }
  })

  const subjects = await prisma.assessmentSubject.findMany({
    orderBy: { name: "asc" }
  })

  return noStore(NextResponse.json({ questions, subjects }))
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const body = await request.json() as {
    text?: string
    subjectId?: string
    chapterId?: string
    topic?: string
    difficulty?: Difficulty
    explanation?: string
    tags?: string[]
    source?: string
    passageId?: string
    externalId?: string
    options?: Array<{ optionKey: string; text: string; isCorrect: boolean }>
  }

  const text = body.text?.trim()
  const options = body.options || []

  if (!text) return noStore(NextResponse.json({ error: "متن سؤال الزامی است" }, { status: 400 }))
  if (!body.subjectId) return noStore(NextResponse.json({ error: "درس الزامی است" }, { status: 400 }))
  if (options.length !== 4) return noStore(NextResponse.json({ error: "سؤال باید چهار گزینه داشته باشد" }, { status: 400 }))
  if (options.filter((option) => option.isCorrect).length !== 1) {
    return noStore(NextResponse.json({ error: "دقیقاً یک گزینه صحیح لازم است" }, { status: 400 }))
  }

  const status = session.user.role === "ADMIN" ? "APPROVED" : "PENDING_REVIEW"

  const question = await prisma.question.create({
    data: {
      text,
      subjectId: body.subjectId,
      chapterId: body.chapterId || null,
      passageId: body.passageId || null,
      topic: body.topic?.trim() || null,
      difficulty: body.difficulty || "MEDIUM",
      explanation: body.explanation?.trim() || null,
      tagsJson: body.tags || [],
      source: body.source?.trim() || null,
      externalId: body.externalId?.trim() || null,
      authorId: session.user.id,
      status,
      options: {
        create: options.map((option, position) => ({
          optionKey: option.optionKey,
          text: option.text.trim(),
          isCorrect: option.isCorrect,
          position
        }))
      },
      versions: {
        create: {
          version: 1,
          snapshot: {
            text,
            subjectId: body.subjectId,
            chapterId: body.chapterId || null,
            topic: body.topic || null,
            difficulty: body.difficulty || "MEDIUM",
            options
          },
          changedBy: session.user.id
        }
      }
    },
    include: { options: { orderBy: { position: "asc" } } }
  })

  return noStore(NextResponse.json({ success: true, question }))
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return noStore(NextResponse.json({ error: "Unauthorized" }, { status: 401 }) )
  }

  const body = await request.json() as { questionIds?: string[]; action?: "APPROVE" | "ARCHIVE" | "PENDING_REVIEW" }
  if (!body.questionIds?.length || !body.action) {
    return noStore(NextResponse.json({ error: "Invalid request" }, { status: 400 }))
  }

  if (body.action === "APPROVE" && session.user.role !== "ADMIN") {
    return noStore(NextResponse.json({ error: "Only administrators can approve questions" }, { status: 403 }))
  }

  const status: QuestionStatus = body.action === "APPROVE"
    ? "APPROVED"
    : body.action === "ARCHIVE"
      ? "ARCHIVED"
      : "PENDING_REVIEW"

  const ownershipWhere = session.user.role === "COUNSELOR"
    ? { id: { in: body.questionIds }, authorId: session.user.id }
    : { id: { in: body.questionIds } }

  await prisma.question.updateMany({
    where: ownershipWhere,
    data: { status }
  })

  return noStore(NextResponse.json({ success: true }))
}
