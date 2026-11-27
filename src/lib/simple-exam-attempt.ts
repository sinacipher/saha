import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type LockedAttempt = {
  id: string
  startedAt: Date
  deadlineAt: Date | null
  submittedAt: Date | null
  answersJson: Prisma.JsonValue
  percentage: number
  durationMinutes: number
  questionCount: number
  answerKeyJson: Prisma.JsonValue
  endAt: Date | null
}

export type FinalizeSimpleExamAttemptResult =
  | { status: "NOT_FOUND" }
  | { status: "NOT_DUE"; deadlineAt: Date }
  | {
      status: "SUBMITTED"
      attemptId: string
      percentage: number
      submittedAt: Date
      alreadySubmitted: boolean
    }

function toStringMap(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") result[key] = entry
  }
  return result
}

/**
 * Finalizes an in-progress attempt using answers saved in PostgreSQL.
 * The row lock prevents a simultaneous autosave from racing with finalization.
 */
export async function finalizeSimpleExamAttempt(
  examId: string,
  studentId: string,
  allowEarlySubmission = false,
): Promise<FinalizeSimpleExamAttemptResult> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<LockedAttempt[]>`
      SELECT
        attempt."id" AS "id",
        attempt."startedAt" AS "startedAt",
        attempt."deadlineAt" AS "deadlineAt",
        attempt."submittedAt" AS "submittedAt",
        attempt."answersJson" AS "answersJson",
        attempt."percentage" AS "percentage",
        exam."durationMinutes" AS "durationMinutes",
        exam."questionCount" AS "questionCount",
        exam."answerKeyJson" AS "answerKeyJson",
        exam."endAt" AS "endAt"
      FROM "SimpleExamAttempt" AS attempt
      INNER JOIN "SimpleExam" AS exam ON exam."id" = attempt."examId"
      WHERE attempt."examId" = ${examId}
        AND attempt."studentId" = ${studentId}
      LIMIT 1
      FOR UPDATE OF attempt
    `

    const attempt = rows[0]
    if (!attempt) return { status: "NOT_FOUND" }

    if (attempt.submittedAt) {
      return {
        status: "SUBMITTED",
        attemptId: attempt.id,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
        alreadySubmitted: true,
      }
    }

    const durationMs = Math.max(0, attempt.durationMinutes) * 60_000
    const fallbackDeadline = attempt.startedAt.getTime() + durationMs
    const storedDeadline = attempt.deadlineAt?.getTime() ?? fallbackDeadline
    const deadlineAt = new Date(
      Math.min(storedDeadline, attempt.endAt?.getTime() ?? Number.POSITIVE_INFINITY),
    )
    const now = new Date()

    if (!allowEarlySubmission && now.getTime() < deadlineAt.getTime()) {
      return { status: "NOT_DUE", deadlineAt }
    }

    const savedAnswers = toStringMap(attempt.answersJson)
    const answerKey = toStringMap(attempt.answerKeyJson)
    const normalizedAnswers: Record<string, string> = {}
    let correctCount = 0
    let incorrectCount = 0
    let unansweredCount = 0

    for (let question = 1; question <= attempt.questionCount; question++) {
      const number = String(question)
      const answer = savedAnswers[number]

      if (!answer || !["A", "B", "C", "D"].includes(answer)) {
        unansweredCount++
        continue
      }

      normalizedAnswers[number] = answer
      if (answer === answerKey[number]) correctCount++
      else incorrectCount++
    }

    const rawScore = correctCount * 3 - incorrectCount
    const maxPossibleScore = attempt.questionCount * 3
    const percentage = maxPossibleScore > 0
      ? Math.max(0, Math.round((rawScore / maxPossibleScore) * 10_000) / 100)
      : 0

    await tx.simpleExamAttempt.update({
      where: { id: attempt.id },
      data: {
        answersJson: normalizedAnswers as Prisma.InputJsonObject,
        correctCount,
        incorrectCount,
        unansweredCount,
        rawScore,
        percentage,
        submittedAt: now,
      },
    })

    return {
      status: "SUBMITTED",
      attemptId: attempt.id,
      percentage,
      submittedAt: now,
      alreadySubmitted: false,
    }
  })
}
