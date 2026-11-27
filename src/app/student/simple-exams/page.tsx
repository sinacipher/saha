import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function StudentSimpleExamsList() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  const now = new Date()

  const exams = await prisma.simpleExam.findMany({
    where: {
      AND: [
        {
          OR: [
            { startAt: null },
            { startAt: { lte: now } },
          ],
        },
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      questionCount: true,
      durationMinutes: true,
      startAt: true,
      endAt: true,
      attempts: {
        where: { studentId: session.user.id },
        select: { id: true },
      },
    },
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">آزمون‌های من</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          آزمون‌های در دسترس خود را مشاهده کنید و در آن‌ها شرکت کنید.
        </p>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
          <h2 className="font-bold">آزمونی در دسترس نیست</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            در حال حاضر آزمون فعالی برای شما ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const hasAttempted = exam.attempts.length > 0

            return (
              <article
                key={exam.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-bold">{exam.title}</h2>

                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>{exam.questionCount} سوال</p>
                    <p>{exam.durationMinutes} دقیقه</p>

                    {exam.endAt && (
                      <p>
                        پایان مهلت:{" "}
                        {new Intl.DateTimeFormat("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(exam.endAt)}
                      </p>
                    )}
                  </div>
                </div>

                {hasAttempted ? (
                  <div className="mt-5 rounded-lg bg-green-50 p-3 text-center text-sm font-medium text-green-700">
                    شما در این آزمون شرکت کرده‌اید.
                    <Link
                      href={`/student/simple-exams/${exam.id}/result`}
                      className="mt-2 block font-bold underline"
                    >
                      مشاهده وضعیت و کارنامه
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/student/simple-exams/${exam.id}`}
                    className="mt-5 block rounded-lg bg-primary p-3 text-center font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    شرکت در آزمون
                  </Link>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}