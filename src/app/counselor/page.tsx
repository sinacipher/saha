import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getSimpleExamAttemptsByStudent,
  calculatePerformanceSummary,
} from "@/lib/simple-exam-performance"
import { countUnreadMessagesForParticipants } from "@/lib/chat-unread"
import Link from "next/link"
import { redirect } from "next/navigation"
import { TrendingUp, ClipboardList, Users, MessageSquare } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function CounselorDashboard() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "COUNSELOR") redirect("/login")

  const students = await prisma.studentProfile.findMany({
    where: { counselorId: session.user.id },
    include: {
      user: true,
      parents: { include: { user: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  })

  const studentUserIds = students.map((student) => student.userId)
  const participantUserIds = Array.from(
    new Set(
      students.flatMap((student) => [
        student.userId,
        ...student.parents.map((parent) => parent.userId),
      ]),
    ),
  )

  const [attemptsByStudent, unreadGroups] = await Promise.all([
    getSimpleExamAttemptsByStudent(studentUserIds),
    participantUserIds.length > 0
      ? prisma.message.groupBy({
          by: ["senderId"],
          where: {
            senderId: { in: participantUserIds },
            readAt: null,
            chat: { is: { counselorId: session.user.id } },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ])

  const unreadBySender = new Map(
    unreadGroups.map((item) => [item.senderId, item._count._all]),
  )

  const studentsWithUnread = students.map((student) => {
    const attempts = attemptsByStudent.get(student.userId) ?? []
    const parentUserIds = student.parents.map((parent) => parent.userId)

    return {
      ...student,
      unreadCount: countUnreadMessagesForParticipants(
        [student.userId, ...parentUserIds],
        unreadBySender,
      ),
      performance: calculatePerformanceSummary(attempts),
    }
  })

  const allAttempts = [...attemptsByStudent.values()].flat()
  const overall = calculatePerformanceSummary(allAttempts)
  const totalUnread = studentsWithUnread.reduce(
    (sum, student) => sum + student.unreadCount,
    0,
  )

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">پنل مشاور ریمو</p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">دانش‌آموزان من</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            پیگیری ارتباطات خانواده و روند آزمون دانش‌آموزان اختصاص‌یافته به شما
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
          <Users className="h-4 w-4" /> {students.length} دانش‌آموز
        </span>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="دانش‌آموزان" value={students.length} icon={<Users className="h-4 w-4" />} />
        <Metric label="آزمون‌های ثبت‌شده" value={overall.attempts} icon={<ClipboardList className="h-4 w-4" />} />
        <Metric label="میانگین درصد" value={`${overall.averagePercentage}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <Metric label="پیام‌های خوانده‌نشده" value={totalUnread} icon={<MessageSquare className="h-4 w-4" />} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/counselor/performance" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-600">
          <TrendingUp className="h-4 w-4" /> گزارش عملکرد دانش‌آموزان
        </Link>
        <Link href="/counselor/simple-exams" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold transition hover:bg-muted">
          <ClipboardList className="h-4 w-4" /> آزمون‌ها و نتایج
        </Link>
      </div>

      {studentsWithUnread.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-bold">هنوز دانش‌آموزی به شما اختصاص داده نشده است.</p>
          <p className="mt-2 text-sm text-muted-foreground">پس از تخصیص دانش‌آموز توسط مدیر، پرونده او در این قسمت نمایش داده می‌شود.</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {studentsWithUnread.map((student) => (
            <Link
              key={student.id}
              href={`/counselor/students/${student.userId}`}
              className="group rounded-2xl border border-border bg-card p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-bold group-hover:text-primary">{student.user.fullName || "دانش‌آموز بدون نام"}</h2>
                  <p className="mt-2 text-sm text-muted-foreground" dir="ltr">{student.user.phone}</p>
                </div>
                {student.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600">
                    {student.unreadCount} پیام جدید
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-sunken p-3">
                  <p className="text-xs text-muted-foreground">تعداد آزمون</p>
                  <p className="mt-1 text-lg font-extrabold">{student.performance.attempts}</p>
                </div>
                <div className="rounded-xl bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">میانگین درصد</p>
                  <p className="mt-1 text-lg font-extrabold text-primary">{student.performance.averagePercentage}%</p>
                </div>
              </div>
              <p className="mt-4 text-xs font-bold text-primary">مشاهده پرونده و گفت‌وگو <span aria-hidden="true">←</span></p>
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <p className="text-xs leading-5 text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </article>
  )
}
