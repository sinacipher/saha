import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  BookOpenCheck,
  MessageSquare,
  ClipboardList,
  GraduationCap,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react"

export const dynamic = "force-dynamic"

export default async function StudentDashboard() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "STUDENT") redirect("/login")

  const now = new Date()
  const [profile, availableExamCount, completedExamCount] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: { counselor: { select: { id: true, fullName: true } } },
    }),
    prisma.simpleExam.count({
      where: {
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
    }),
    prisma.simpleExamAttempt.count({ where: { studentId: session.user.id } }),
  ])

  const counselor = profile?.counselor

  return (
    <main className="mx-auto max-w-6xl space-y-7">
      <header className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-secondary/5 p-6 sm:p-8">
        <div aria-hidden="true" className="absolute -left-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-primary">فضای آموزشی ریمو</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">خوش آمدید، {session.user.name || "دانش‌آموز"}</h1>
            <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
              آزمون‌های فعال، ارتباط با مشاور و روند آموزشی خود را از یک پنل دنبال کنید.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <GraduationCap className="h-9 w-9" />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="آزمون‌های در دسترس" value={availableExamCount} icon={<BookOpenCheck className="h-5 w-5" />} />
        <Metric label="آزمون‌های ثبت‌شده" value={completedExamCount} icon={<ClipboardList className="h-5 w-5" />} />
        <Metric label="وضعیت مشاور" value={counselor ? "متصل" : "تعیین نشده"} icon={<ShieldCheck className="h-5 w-5" />} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/student/simple-exams" className="group rounded-2xl border border-border bg-card p-6 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover">
          <div className="flex items-start justify-between gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpenCheck className="h-6 w-6" /></span>
            <ArrowLeft className="h-5 w-5 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
          </div>
          <h2 className="mt-5 text-lg font-bold">آزمون‌های من</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">مشاهده آزمون‌های فعال، ثبت پاسخ‌ها و بررسی کارنامه‌های منتشرشده.</p>
          <p className="mt-4 text-sm font-bold text-primary">رفتن به آزمون‌ها</p>
        </Link>

        {counselor ? (
          <Link href="/student/chat" className="group rounded-2xl border border-border bg-card p-6 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-hover">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><MessageSquare className="h-6 w-6" /></span>
              <ArrowLeft className="h-5 w-5 text-muted-foreground transition group-hover:-translate-x-1 group-hover:text-primary" />
            </div>
            <h2 className="mt-5 text-lg font-bold">گفت‌وگو با مشاور</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">ارتباط مستقیم با {counselor.fullName || "مشاور شما"} و پیگیری پیام‌ها.</p>
            <p className="mt-4 text-sm font-bold text-primary">باز کردن گفتگو</p>
          </Link>
        ) : (
          <article className="rounded-2xl border border-dashed border-border bg-card p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"><MessageSquare className="h-6 w-6" /></span>
            <h2 className="mt-5 text-lg font-bold">مشاور هنوز تعیین نشده است</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">پس از اختصاص مشاور توسط مدیر، بخش گفتگو در این پنل فعال می‌شود.</p>
          </article>
        )}
      </section>
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
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </article>
  )
}
