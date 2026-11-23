import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let resultWhere: Prisma.AssessmentResultWhereInput = { published: true }

  if (session.user.role === "STUDENT") {
    resultWhere = { published: true, studentId: session.user.id }
  } else if (session.user.role === "PARENT") {
    const profile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { student: true }
    })
    if (!profile?.student?.userId) {
      return NextResponse.json({ trends: [], subjects: [], summary: null })
    }
    resultWhere = { published: true, studentId: profile.student.userId }
  } else if (session.user.role === "COUNSELOR") {
    const students = await prisma.studentProfile.findMany({
      where: { counselorId: session.user.id },
      select: { userId: true }
    })
    resultWhere = { published: true, studentId: { in: students.map((student) => student.userId) } }
  } else if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const results = await prisma.assessmentResult.findMany({
    where: resultWhere,
    include: {
      assessment: { select: { id: true, title: true, type: true } }
    },
    orderBy: { createdAt: "asc" }
  })

  const trends = results.map((result) => ({
    assessmentId: result.assessmentId,
    title: result.assessment.title,
    percentage: result.percentage,
    rawScore: result.rawScore,
    correct: result.correctAnswers,
    incorrect: result.incorrectAnswers,
    unanswered: result.unansweredAnswers,
    createdAt: result.createdAt.toISOString()
  }))

  const subjectTotals: Record<string, { correct: number; incorrect: number; unanswered: number; resultCount: number }> = {}
  for (const result of results) {
    const subjectScores = result.subjectScoresJson as Record<string, { correct: number; incorrect: number; unanswered: number }>
    for (const [subjectId, score] of Object.entries(subjectScores)) {
      const current = subjectTotals[subjectId] || { correct: 0, incorrect: 0, unanswered: 0, resultCount: 0 }
      current.correct += score.correct
      current.incorrect += score.incorrect
      current.unanswered += score.unanswered
      current.resultCount++
      subjectTotals[subjectId] = current
    }
  }

  const subjectIds = Object.keys(subjectTotals)
  const subjectRecords = await prisma.assessmentSubject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true }
  })
  const subjectNameMap = new Map(subjectRecords.map((subject) => [subject.id, subject.name]))

  const subjects = Object.entries(subjectTotals).map(([subjectId, totals]) => {
    const answered = totals.correct + totals.incorrect
    const percentage = answered > 0 ? Number(((totals.correct / answered) * 100).toFixed(2)) : 0
    return {
      subjectId,
      name: subjectNameMap.get(subjectId) || "درس",
      ...totals,
      percentage
    }
  })

  const totalAttempts = results.length
  const averagePercentage = totalAttempts
    ? Number((results.reduce((sum, result) => sum + result.percentage, 0) / totalAttempts).toFixed(2))
    : 0

  return NextResponse.json({
    summary: {
      totalAttempts,
      averagePercentage,
      highestPercentage: totalAttempts ? Math.max(...results.map((result) => result.percentage)) : 0,
      lowestPercentage: totalAttempts ? Math.min(...results.map((result) => result.percentage)) : 0
    },
    trends,
    subjects
  })
}
