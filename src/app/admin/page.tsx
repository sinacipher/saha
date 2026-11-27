import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Users,
  UserRoundCheck,
  GraduationCap,
  MessageSquare,
  TrendingUp,
  ClipboardList,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const [
    totalUsers,
    activeCounselors,
    students,
    parents,
    chats,
    unreadMessages,
    examPerformance,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "COUNSELOR", isActive: true } }),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { role: "PARENT", isActive: true } }),
    prisma.chat.count(),
    prisma.message.count({ where: { readAt: null } }),
    prisma.simpleExamAttempt.aggregate({
      _count: { _all: true },
      _avg: { percentage: true },
    }),
  ])

  const stats = [
    { label: "کل کاربران", value: totalUsers, icon: Users },
    { label: "مشاوران فعال", value: activeCounselors, icon: UserRoundCheck },
    { label: "دانش‌آموزان فعال", value: students, icon: GraduationCap },
    { label: "والدین فعال", value: parents, icon: Users },
    { label: "گفت‌وگوها", value: chats, icon: MessageSquare },
    { label: "پیام‌های خوانده‌نشده", value: unreadMessages, icon: MessageSquare },
  ]

  return (
    <main className="space-y-7">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">داشبورد مدیریت</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          نمای کلی وضعیت کاربران، ارتباطات و عملکرد آزمون‌های سحا
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <article key={stat.label} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
              <p className="mt-1 text-2xl font-extrabold">{stat.value}</p>
            </article>
          )
        })}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">عملکرد آزمون‌های دانش‌آموزان</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {examPerformance._count._all} آزمون ثبت‌شده · میانگین درصد {examPerformance._avg.percentage == null ? 0 : Math.round(examPerformance._avg.percentage * 100) / 100}%
            </p>
          </div>
          <Link
            href="/admin/performance"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            <ClipboardList className="h-4 w-4" />
            مشاهده گزارش کامل
          </Link>
        </div>
      </section>
    </main>
  )
}
