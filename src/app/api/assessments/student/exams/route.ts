import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const assignments = await prisma.assessmentAssignment.findMany({
    where: { studentId: session.user.id },
    include: {
      assessment: {
        include: {
          sections: { orderBy: { position: "asc" } },
          attempts: { where: { studentId: session.user.id }, orderBy: { attemptNumber: "desc" } },
          results: { where: { studentId: session.user.id } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  const exams = assignments.map(({ assessment }) => {
    const activeAttempt = assessment.attempts.find((attempt) => attempt.status === "IN_PROGRESS")
    const latestAttempt = assessment.attempts[0] || null
    const latestResult = assessment.results.find((result) => result.published) || assessment.results[0] || null

    return {
      id: assessment.id,
      title: assessment.title,
      description: assessment.description,
      type: assessment.type,
      status: assessment.status,
      durationSeconds: assessment.durationSeconds,
      startAt: assessment.startAt?.toISOString() || null,
      endAt: assessment.endAt?.toISOString() || null,
      resultReleaseAt: assessment.resultReleaseAt?.toISOString() || null,
      sectionCount: assessment.sections.length,
      questionCount: assessment.sections.reduce((sum, section) => sum + section.questionCount, 0),
      activeAttemptId: activeAttempt?.id || null,
      activeAttemptExpiresAt: activeAttempt?.expiresAt.toISOString() || null,
      latestAttemptStatus: latestAttempt?.status || null,
      publishedResultId: latestResult?.published ? latestResult.id : null
    }
  })

  return NextResponse.json({ exams })
}
