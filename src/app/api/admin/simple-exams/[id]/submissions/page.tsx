
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Prisma } from "@prisma/client"

const optionLabels: Record<string, string> = {
  A: "الف",
  B: "ب",
  C: "ج",
  D: "د",
}

function toAnswerMap(value: Prisma.JsonValue): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, string>
}

function formatDate(date: Date | null) {
  if (!date) return "—"

  return new Date(date).toLocaleString("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function SimpleExamSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const { id } = await params

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
        where: {
          submittedAt: { not: null },
        },
        orderBy: [
          { percentage: "desc" },
          { submittedAt: "asc" },
        ],
      },
    },
  })

  if (!exam) {
    notFound()
  }

  const studentIds = [
    ...new Set(exam.attempts.map((attempt) => attempt.studentId)),
  ]

  const students = await prisma.user.findMany({
    where: {
      id: { in: studentIds },
    },
    select: {
      id: true,
      fullName: true,
      nationalId: true,
    },
  })

  const studentMap = new Map(
    students.map((student) => [student.id, student])
  )

  const answerKey = toAnswerMap(exam.answerKeyJson)
  const totalAttempts = exam.attempts.length

  const average =
    totalAttempts > 0
      ? exam.attempts.reduce(
          (sum, attempt) => sum + attempt.percentage,
          0
        ) / totalAttempts
      : 0

  const highest =
    totalAttempts > 0
      ? Math.max(...exam.attempts.map((attempt) => attempt.percentage))
      : 0

  const lowest =
    totalAttempts > 0
      ? Math.min(...exam.attempts.map((attempt) => attempt.percentage))
      : 0

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            نتایج و تصحیح آزمون
          </h1>

          <p className="mt-2 text-muted-foreground">
            {exam.title}
          </p>
        </div>

        <Link
          href="/admin/simple-exams"
          className="rounded-lg border border-border px-4 py-2 text-center text-sm font-medium transition hover:bg-muted"
        >
          بازگشت به آزمون‌ها
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            تعداد شرکت‌کنندگان
          </p>
          <p className="mt-2 text-2xl font-bold">
            {totalAttempts}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            میانگین درصد
          </p>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {average.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            بالاترین درصد
          </p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {highest.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            پایین‌ترین درصد
          </p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {lowest.toFixed(2)}%
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="font-bold">
            فهرست نتایج دانش‌آموزان
          </h2>
        </div>

        {exam.attempts.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">
            هنوز هیچ دانش‌آموزی در این آزمون شرکت نکرده است.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-right text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3">رتبه</th>
                  <th className="px-4 py-3">نام دانش‌آموز</th>
                  <th className="px-4 py-3">کد ملی</th>
                  <th className="px-4 py-3">صحیح</th>
                  <th className="px-4 py-3">غلط</th>
                  <th className="px-4 py-3">بدون پاسخ</th>
                  <th className="px-4 py-3">نمره خام</th>
                  <th className="px-4 py-3">درصد</th>
                  <th className="px-4 py-3">تاریخ ثبت</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {exam.attempts.map((attempt, index) => {
                  const student = studentMap.get(attempt.studentId)

                  return (
                    <tr key={attempt.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-bold">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {student?.fullName || "نامشخص"}
                      </td>

                      <td className="px-4 py-3" dir="ltr">
                        {student?.nationalId || "-"}
                      </td>

                      <td className="px-4 py-3 text-green-600">
                        {attempt.correctCount}
                      </td>

                      <td className="px-4 py-3 text-red-600">
                        {attempt.incorrectCount}
                      </td>

                      <td className="px-4 py-3">
                        {attempt.unansweredCount}
                      </td>

                      <td className="px-4 py-3">
                        {attempt.rawScore} / {exam.questionCount * 3}
                      </td>

                      <td className="px-4 py-3 font-bold text-primary">
                        {attempt.percentage}%
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDate(attempt.submittedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {exam.attempts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">
            بررسی پاسخ‌های هر دانش‌آموز
          </h2>

          {exam.attempts.map((attempt, index) => {
            const student = studentMap.get(attempt.studentId)
            const studentAnswers = toAnswerMap(attempt.answersJson)

            return (
              <details
                key={attempt.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <summary className="cursor-pointer list-none p-4 transition hover:bg-muted/40">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="font-bold">
                        {index + 1}. {student?.fullName || "دانش‌آموز نامشخص"}
                      </span>

                      <span className="mr-2 text-sm text-muted-foreground">
                        ({student?.nationalId || "بدون کد ملی"})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="font-bold text-primary">
                        {attempt.percentage}%
                      </span>

                      <span className="text-green-600">
                        صحیح: {attempt.correctCount}
                      </span>

                      <span className="text-red-600">
                        غلط: {attempt.incorrectCount}
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-border p-4">
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        پاسخ صحیح
                      </p>
                      <p className="mt-1 font-bold text-green-600">
                        {attempt.correctCount}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        پاسخ غلط
                      </p>
                      <p className="mt-1 font-bold text-red-600">
                        {attempt.incorrectCount}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        بدون پاسخ
                      </p>
                      <p className="mt-1 font-bold">
                        {attempt.unansweredCount}
                      </p>
                    </div>

                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">
                        نمره خام
                      </p>
                      <p className="mt-1 font-bold">
                        {attempt.rawScore} / {exam.questionCount * 3}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[450px] text-right text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-3">سوال</th>
                          <th className="px-3 py-3">پاسخ دانش‌آموز</th>
                          <th className="px-3 py-3">پاسخ صحیح</th>
                          <th className="px-3 py-3">وضعیت</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-border">
                        {Array.from(
                          { length: exam.questionCount },
                          (_, questionIndex) => {
                            const questionNumber = String(questionIndex + 1)
                            const studentAnswer = studentAnswers[questionNumber]
                            const correctAnswer = answerKey[questionNumber]

                            const isCorrect =
                              Boolean(studentAnswer) &&
                              studentAnswer === correctAnswer

                            const isUnanswered = !studentAnswer

                            return (
                              <tr key={questionNumber}>
                                <td className="px-3 py-3 font-bold">
                                  {questionNumber}
                                </td>

                                <td className="px-3 py-3">
                                  {studentAnswer
                                    ? `${optionLabels[studentAnswer] || studentAnswer} (${studentAnswer})`
                                    : "بدون پاسخ"}
                                </td>

                                <td className="px-3 py-3 font-medium text-green-600">
                                  {correctAnswer
                                    ? `${optionLabels[correctAnswer] || correctAnswer} (${correctAnswer})`
                                    : "ثبت نشده"}
                                </td>

                                <td className="px-3 py-3">
                                  {isUnanswered ? (
                                    <span className="font-medium text-muted-foreground">
                                      بدون پاسخ
                                    </span>
                                  ) : isCorrect ? (
                                    <span className="font-medium text-green-600">
                                      صحیح
                                    </span>
                                  ) : (
                                    <span className="font-medium text-red-600">
                                      غلط
                                    </span>
                                  )}
                                </td>
                              </tr>
                            )
                          }
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    زمان ثبت پاسخ: {formatDate(attempt.submittedAt)}
                  </p>
                </div>
              </details>
            )
          })}
        </section>
      )}
    </main>
  )
}
