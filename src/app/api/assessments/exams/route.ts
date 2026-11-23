import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AssessmentStatus, AssessmentType } from "@prisma/client"
import { NextResponse } from "next/server"

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const assessments = await prisma.assessment.findMany({
    where: session.user.role === "COUNSELOR" ? { creatorId: session.user.id } : {},
    include: {
      sections: { include: { questions: true }, orderBy: { position: "asc" } },
      assignments: true,
      scoringRules: true,
      creator: { select: { id: true, fullName: true } }
    },
    orderBy: { updatedAt: "desc" }
  })

  return noStore(NextResponse.json({ assessments }))
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const body = await request.json() as {
    title?: string
    description?: string
    instructions?: string
    type?: AssessmentType
    durationSeconds?: number
    startAt?: string
    endAt?: string
    resultReleaseAt?: string
    maxAttempts?: number
    randomizeQuestions?: boolean
    randomizeOptions?: boolean
    allowNavigation?: boolean
    studentIds?: string[]
    sections?: Array<{ title: string; subjectId?: string; durationSeconds?: number; questionIds: string[] }>
    scoring?: { correctPoints?: number; incorrectPenalty?: number; unansweredPoints?: number; roundingPrecision?: number }
  }

  const title = body.title?.trim()
  const durationSeconds = Number(body.durationSeconds)
  if (!title) return noStore(NextResponse.json({ error: "عنوان آزمون الزامی است" }, { status: 400 }))
  if (!Number.isInteger(durationSeconds) || durationSeconds < 60) {
    return noStore(NextResponse.json({ error: "مدت آزمون نامعتبر است" }, { status: 400 }))
  }
  if (!body.sections?.length) {
    return noStore(NextResponse.json({ error: "حداقل یک بخش آزمون الزامی است" }, { status: 400 }))
  }

  const studentIds = Array.from(new Set(body.studentIds || []))
  if (session.user.role === "COUNSELOR") {
    const assignedProfiles = await prisma.studentProfile.findMany({
      where: { userId: { in: studentIds }, counselorId: session.user.id },
      select: { userId: true }
    })
    const assignedIds = new Set(assignedProfiles.map((profile) => profile.userId))
    if (studentIds.some((studentId) => !assignedIds.has(studentId))) {
      return noStore(NextResponse.json({ error: "تنها می‌توانید دانش‌آموزان اختصاص‌یافته را انتخاب کنید" }, { status: 403 }))
    }
  }

  const allQuestionIds = Array.from(new Set(body.sections.flatMap((section) => section.questionIds)))
  const questions = await prisma.question.findMany({
    where: {
      id: { in: allQuestionIds },
      status: "APPROVED"
    },
    include: { options: { orderBy: { position: "asc" } } }
  })
  if (questions.length !== allQuestionIds.length) {
    return noStore(NextResponse.json({ error: "همه سوالات باید تایید شده باشند" }, { status: 400 }))
  }

  const questionMap = new Map(questions.map((question) => [question.id, question]))

  const assessment = await prisma.$transaction(async (tx) => {
    const created = await tx.assessment.create({
      data: {
        title,
        description: body.description?.trim() || null,
        instructions: body.instructions?.trim() || null,
        type: body.type || "PRACTICE_QUIZ",
        durationSeconds,
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        resultReleaseAt: body.resultReleaseAt ? new Date(body.resultReleaseAt) : null,
        maxAttempts: Math.max(1, Number(body.maxAttempts || 1)),
        randomizeQuestions: !!body.randomizeQuestions,
        randomizeOptions: !!body.randomizeOptions,
        allowNavigation: body.allowNavigation !== false,
        creatorId: session.user.id,
        scoringRules: {
          create: {
            correctPoints: body.scoring?.correctPoints ?? 3,
            incorrectPenalty: body.scoring?.incorrectPenalty ?? -1,
            unansweredPoints: body.scoring?.unansweredPoints ?? 0,
            roundingPrecision: body.scoring?.roundingPrecision ?? 2
          }
        }
      }
    })

    for (let sectionIndex = 0; sectionIndex < body.sections!.length; sectionIndex++) {
      const sectionInput = body.sections![sectionIndex]
      const section = await tx.assessmentSection.create({
        data: {
          assessmentId: created.id,
          title: sectionInput.title,
          subjectId: sectionInput.subjectId || null,
          position: sectionIndex,
          durationSeconds: sectionInput.durationSeconds ? Number(sectionInput.durationSeconds) : null,
          questionCount: sectionInput.questionIds.length
        }
      })

      for (let questionIndex = 0; questionIndex < sectionInput.questionIds.length; questionIndex++) {
        const questionId = sectionInput.questionIds[questionIndex]
        const question = questionMap.get(questionId)
        if (!question) continue

        await tx.assessmentQuestion.create({
          data: {
            assessmentId: created.id,
            sectionId: section.id,
            questionId,
            position: questionIndex,
            snapshot: {
              text: question.text,
              topic: question.topic,
              difficulty: question.difficulty,
              subjectId: question.subjectId,
              chapterId: question.chapterId,
              passageId: question.passageId,
              options: question.options.map((option) => ({
                optionKey: option.optionKey,
                text: option.text,
                isCorrect: option.isCorrect
              }))
            }
          }
        })
      }
    }

    for (const studentId of studentIds) {
      await tx.assessmentAssignment.create({
        data: { assessmentId: created.id, studentId, assignedById: session.user.id }
      })
    }

    await tx.assessmentAuditLog.create({
      data: {
        assessmentId: created.id,
        actorId: session.user.id,
        action: "CREATED",
        entityType: "ASSESSMENT",
        entityId: created.id,
        metadata: { title, studentCount: studentIds.length }
      }
    })

    return created
  })

  return noStore(NextResponse.json({ success: true, assessmentId: assessment.id }))
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const body = await request.json() as { assessmentId?: string; action?: "READY" | "SCHEDULE" | "ARCHIVE" | "PUBLISH_RESULTS" }
  if (!body.assessmentId || !body.action) {
    return noStore(NextResponse.json({ error: "Invalid request" }, { status: 400 }))
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: body.assessmentId } })
  if (!assessment) return noStore(NextResponse.json({ error: "آزمون یافت نشد" }, { status: 404 }))
  if (session.user.role === "COUNSELOR" && assessment.creatorId !== session.user.id) {
    return noStore(NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 }))
  }
  if (body.action === "PUBLISH_RESULTS" && session.user.role !== "ADMIN") {
    return noStore(NextResponse.json({ error: "فقط مدیر می‌تواند نتایج را منتشر کند" }, { status: 403 }))
  }

  let status: AssessmentStatus
  if (body.action === "READY") status = "READY"
  else if (body.action === "SCHEDULE") status = "SCHEDULED"
  else if (body.action === "PUBLISH_RESULTS") status = "PUBLISHED"
  else status = "ARCHIVED"

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: { status }
  })

  if (body.action === "PUBLISH_RESULTS") {
    await prisma.assessmentResult.updateMany({
      where: { assessmentId: assessment.id, published: false },
      data: { published: true, publishedAt: new Date() }
    })
  }

  await prisma.assessmentAuditLog.create({
    data: {
      assessmentId: assessment.id,
      actorId: session.user.id,
      action: body.action,
      entityType: "ASSESSMENT",
      entityId: assessment.id
    }
  })

  return noStore(NextResponse.json({ success: true, status }))
}
