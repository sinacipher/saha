import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const assessmentId = searchParams.get("assessmentId")
  const requestedStudentId = searchParams.get("studentId")

  let where: Prisma.AssessmentResultWhereInput = { published: true }

  if (session.user.role === "STUDENT") {
    where = {
      published: true,
      studentId: session.user.id,
      ...(assessmentId ? { assessmentId } : {})
    }
  } else if (session.user.role === "PARENT") {
    const profile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { student: true }
    })
    if (!profile?.studentId) {
      return NextResponse.json({ results: [] })
    }

    where = {
      published: true,
      studentId: profile.student?.userId,
      ...(assessmentId ? { assessmentId } : {})
    }
  } else if (session.user.role === "COUNSELOR") {
    if (requestedStudentId) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: requestedStudentId }
      })
      if (!profile || profile.counselorId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const assigned = await prisma.studentProfile.findMany({
      where: { counselorId: session.user.id },
      select: { userId: true }
    })
    const studentIds = assigned.map((profile) => profile.userId)

    where = {
      published: true,
      studentId: requestedStudentId
        ? requestedStudentId
        : { in: studentIds },
      ...(assessmentId ? { assessmentId } : {})
    }
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const results = await prisma.assessmentResult.findMany({
    where,
    include: {
      assessment: { select: { id: true, title: true, type: true, resultReleaseAt: true } },
      attempt: { select: { attemptNumber: true, submittedAt: true, timeSpentSeconds: true } }
    },
    orderBy: { publishedAt: "desc" }
  })

  const studentIds = Array.from(new Set(results.map((result) => result.studentId)))
  const students = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true }
  })
  const studentMap = new Map(students.map((student) => [student.id, student.fullName]))

  return NextResponse.json({
    results: results.map((result) => ({
      id: result.id,
      assessmentId: result.assessmentId,
      assessmentTitle: result.assessment.title,
      assessmentType: result.assessment.type,
      studentId: result.studentId,
      studentName: studentMap.get(result.studentId) || "دانش‌آموز",
      attemptNumber: result.attempt.attemptNumber,
      submittedAt: result.attempt.submittedAt?.toISOString() || null,
      timeSpentSeconds: result.attempt.timeSpentSeconds,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      incorrectAnswers: result.incorrectAnswers,
      unansweredAnswers: result.unansweredAnswers,
      rawScore: result.rawScore,
      percentage: result.percentage,
      subjectScoresJson: result.subjectScoresJson,
      sectionScoresJson: result.sectionScoresJson,
      percentile: result.percentile,
      internalRank: result.internalRank,
      publishedAt: result.publishedAt?.toISOString() || null
    }))
  })
}
