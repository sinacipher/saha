import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

const PAGE_SIZE = 50

export default async function ExamSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) redirect("/login")

  const sp = await searchParams
  const rawPage = Number(sp.page ?? "1")
  const currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  const skip = (currentPage - 1) * PAGE_SIZE

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    select: { id: true, title: true, resultsPublished: true },
  })
  if (!exam) notFound()

  const [attempts, totalCount] = await Promise.all([
    prisma.simpleExamAttempt.findMany({
      where: { examId: id },
      orderBy: { percentage: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.simpleExamAttempt.count({ where: { examId: id } }),
  ])

  const studentIds = attempts.map((a) => a.studentId)
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true },
  })
  const nameMap = new Map(users.map((u) => [u.id, u.fullName]))

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startItem = totalCount === 0 ? 0 : skip + 1
  const endItem = Math.min(skip + PAGE_SIZE, totalCount)

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">نتایج آزمون: {exam.title}</h1>
          <p className="text-sm text-muted-foreground">{totalCount} نفر شرکت کرده‌اند</p>
        </div>
        <div className="flex gap-3">
          <form
            action={async () => {
              "use server"
              await prisma.simpleExam.update({
                where: { id: exam.id },
                data: { resultsPublished: !exam.resultsPublished },
              })
            }}
          >
            <button
              className={`px-4 py-2 rounded-lg text-white font-bold ${
                exam.resultsPublished ? "bg-red-500" : "bg-green-600"
              }`}
            >
              {exam.resultsPublished ? "لغو انتشار نتایج" : "انتشار نتایج برای دانش‌آموزان"}
            </button>
          </form>
          <Link href="/admin/simple-exams" className="px-4 py-2 border rounded-lg hover:bg-muted">
            بازگشت
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3">رتبه</th>
              <th className="px-6 py-3">نام دانش‌آموز</th>
              <th className="px-6 py-3">درصد</th>
              <th className="px-6 py-3">صحیح</th>
              <th className="px-6 py-3">غلط</th>
              <th className="px-6 py-3">زمان ثبت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {attempts.map((attempt, index) => (
              <tr key={attempt.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-muted-foreground">{skip + index + 1}</td>
                <td className="px-6 py-4 font-medium">{nameMap.get(attempt.studentId) ?? "ناشناس"}</td>
                <td className="px-6 py-4 font-bold text-primary">{attempt.percentage}%</td>
                <td className="px-6 py-4 text-green-600">{attempt.correctCount}</td>
                <td className="px-6 py-4 text-red-600">{attempt.incorrectCount}</td>
                <td className="px-6 py-4 text-sm" dir="ltr">
                  {new Date(attempt.submittedAt).toLocaleDateString("fa-IR")}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  هیچ دانش‌آموزی شرکت نکرده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            نمایش {startItem} تا {endItem} از {totalCount} دانش‌آموز
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`?page=${Math.max(1, safePage - 1)}`}
              className={`px-3 py-1.5 rounded-lg border border-border text-sm transition ${
                safePage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
              aria-disabled={safePage <= 1}
            >
              قبلی
            </Link>
            <span className="px-3 py-1.5 text-sm font-medium">
              صفحه {safePage} از {totalPages}
            </span>
            <Link
              href={`?page=${Math.min(totalPages, safePage + 1)}`}
              className={`px-3 py-1.5 rounded-lg border border-border text-sm transition ${
                safePage >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
              aria-disabled={safePage >= totalPages}
            >
              بعدی
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}