import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSimpleExamAttemptsByStudent, calculatePerformanceSummary } from "@/lib/simple-exam-performance"
import Link from "next/link"
import { redirect } from "next/navigation"
import { TrendingUp, ClipboardList, Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CounselorDashboard() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "COUNSELOR") {
    redirect("/login")
  }

  const students = await prisma.studentProfile.findMany({
    where: { counselorId: session.user.id },
    include: {
      user: true,
      parents: { include: { user: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  })

  const studentUserIds = students.map((student) => student.userId)
  const attemptsByStudent = await getSimpleExamAttemptsByStudent(studentUserIds)

  const studentsWithUnread = await Promise.all(
    students.map(async (student) => {
      const parentUserIds = student.parents.map((parent) => parent.userId)
      const participantIds = [student.userId, ...parentUserIds]
      const unreadCount = await prisma.message.count({
        where: {
          chat: {
            OR: [
              { studentId: student.id },
              { parentId: { in: student.parents.map((parent) => parent.id) } },
            ],
          },
          senderId: { in: participantIds },
          readAt: null,
        },
      })

      const attempts = attemptsByStudent.get(student.userId) ?? []
      const performance = calculatePerformanceSummary(attempts)

      return { ...student, unreadCount, performance }
    }),
  )

  const allAttempts = [...attemptsByStudent.values()].flat()
  const overall = calculatePerformanceSummary(allAttempts)

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">دانش‌آموزان من</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          وضعیت ارتباطی و عملکرد آزمون دانش‌آموزان اختصاص‌یافته به شما
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" /> دانش‌آموزان
          </div>
          <p className="mt-2 text-2xl font-extrabold">{students.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="h-4 w-4" /> آزمون‌های ثبت‌شده
          </div>
          <p className="mt-2 text-2xl font-extrabold">{overall.attempts}</p>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-card p-4 sm:col-span-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> میانگین درصد
          </div>
          <p className="mt-2 text-2xl font-extrabold text-primary">{overall.averagePercentage}%</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/counselor/performance"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          <TrendingUp className="h-4 w-4" />
          گزارش کامل عملکرد دانش‌آموزان
        </Link>
        <Link
          href="/counselor/simple-exams"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted"
        >
          <ClipboardList className="h-4 w-4" />
          آزمون‌ها و نتایج
        </Link>
      </div>

      {studentsWithUnread.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
          در حال حاضر هیچ دانش‌آموزی به شما اختصاص داده نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {studentsWithUnread.map((student) => (
            <Link
              key={student.id}
              href={`/counselor/students/${student.userId}`}
              className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 break-words text-lg font-bold">
                  {student.user.fullName || "دانش‌آموز بدون نام"}
                </h2>
                {student.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600">
                    {student.unreadCount} پیام جدید
                  </span>
                )}
              </div>

              <p className="mt-2 text-left text-sm text-muted-foreground" dir="ltr">
                {student.user.phone}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">تعداد آزمون</p>
                  <p className="mt-1 font-bold">{student.performance.attempts}</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">میانگین درصد</p>
                  <p className="mt-1 font-bold text-primary">
                    {student.performance.averagePercentage}%
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs font-medium text-primary">
                مشاهده پرونده دانش‌آموز
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
