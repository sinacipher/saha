import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateAssessmentScore } from "@/lib/assessment/scoring"
import { NextResponse } from "next/server"

type ScoringSnapshot = {
  sections: Array<{
    id: string
    title: string
    questions: Array<{
      id: string
      subjectId: string | null
      options: Array<{ optionKey: string; isCorrect?: boolean }>
    }>
  }>
  scoringRule: {
    correctPoints: number
    incorrectPenalty: number
    unansweredPoints: number
    roundingPrecision: number
  } | null
}

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { attemptId } = await context.params
  const body = await request.json().catch(() => ({})) as { timeSpentSeconds?: number }

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: true,
      answers: true,
      result: true
    }
  })

  if (!attempt || attempt.studentId !== session.user.id) {
    return NextResponse.json({ error: "Attempt یافت نشد" }, { status: 404 })
  }
  if (attempt.result) {
    return NextResponse.json({ success: true, alreadySubmitted: true, resultId: attempt.result.id })
  }
  if (!["IN_PROGRESS", "EXPIRED"].includes(attempt.status)) {
    return NextResponse.json({ success: true, alreadySubmitted: true })
  }

  const snapshot = attempt.scoringSnapshot as unknown as ScoringSnapshot
  const scoring = snapshot.scoringRule || {
    correctPoints: 3,
    incorrectPenalty: -1,
    unansweredPoints: 0,
    roundingPrecision: 2
  }

  const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer.optionKey]))
  const answerRecord = Object.fromEntries(answerMap) as Record<string, string | null>
  const calculated = calculateAssessmentScore(
    snapshot.sections,
    answerRecord,
    scoring
  )
  const {
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredAnswers,
    rawScore,
    percentage: roundedPercentage,
    subjectScoresJson,
    sectionScoresJson
  } = calculated
  const timeSpentSeconds = Math.max(0, Number(body.timeSpentSeconds || 0))

  const result = await prisma.$transaction(async (tx) => {
    await tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        timeSpentSeconds
      }
    })

    await tx.attemptEvent.create({
      data: {
        attemptId: attempt.id,
        type: "SUBMITTED",
        metadata: { correctAnswers, incorrectAnswers, unansweredAnswers }
      }
    })

    return tx.assessmentResult.create({
      data: {
        attemptId: attempt.id,
        assessmentId: attempt.assessmentId,
        studentId: attempt.studentId,
        totalQuestions,
        correctAnswers,
        incorrectAnswers,
        unansweredAnswers,
        rawScore,
        percentage: roundedPercentage,
        subjectScoresJson,
        sectionScoresJson
      }
    })
  })

  return NextResponse.json({
    success: true,
    resultId: result.id,
    totalQuestions,
    correctAnswers,
    incorrectAnswers,
    unansweredAnswers,
    rawScore,
    percentage: roundedPercentage
  })
}
