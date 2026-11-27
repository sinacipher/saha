import { prisma } from "@/lib/prisma"

export type SimpleExamPerformanceAttempt = {
  id: string
  examId: string
  examTitle: string
  questionCount: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  rawScore: number
  percentage: number
  submittedAt: Date
}

type GetAttemptsOptions = {
  /** Limit results to exams whose results have been published to students and parents. */
  onlyPublished?: boolean
}

export async function getSimpleExamAttemptsByStudent(
  studentIds: string[],
  options: GetAttemptsOptions = {},
): Promise<Map<string, SimpleExamPerformanceAttempt[]>> {
  const grouped = new Map<string, SimpleExamPerformanceAttempt[]>()
  const uniqueIds = [...new Set(studentIds.filter(Boolean))]
  if (uniqueIds.length === 0) return grouped

  const attempts = await prisma.simpleExamAttempt.findMany({
    where: {
      studentId: { in: uniqueIds },
      ...(options.onlyPublished
        ? { exam: { is: { resultsPublished: true } } }
        : {}),
    },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          questionCount: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  })

  for (const attempt of attempts) {
    const studentAttempts = grouped.get(attempt.studentId) ?? []
    studentAttempts.push({
      id: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.exam.title,
      questionCount: attempt.exam.questionCount,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      rawScore: attempt.rawScore,
      percentage: attempt.percentage,
      submittedAt: attempt.submittedAt,
    })
    grouped.set(attempt.studentId, studentAttempts)
  }

  return grouped
}

export function calculatePerformanceSummary(
  attempts: SimpleExamPerformanceAttempt[],
) {
  const count = attempts.length
  const totalPercentage = attempts.reduce((sum, attempt) => sum + attempt.percentage, 0)

  return {
    attempts: count,
    averagePercentage: count > 0
      ? Math.round((totalPercentage / count) * 100) / 100
      : 0,
    highestPercentage: count > 0
      ? Math.max(...attempts.map((item) => item.percentage))
      : 0,
    correct: attempts.reduce((sum, item) => sum + item.correctCount, 0),
    incorrect: attempts.reduce((sum, item) => sum + item.incorrectCount, 0),
    unanswered: attempts.reduce((sum, item) => sum + item.unansweredCount, 0),
  }
}
