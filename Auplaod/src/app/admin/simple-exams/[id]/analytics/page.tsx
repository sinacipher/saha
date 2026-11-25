import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

export default async function ExamAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    redirect("/login")
  }

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
        include: { },
        orderBy: { percentage: "desc" }
      }
    }
  })

  if (!exam) notFound()

  const studentIds = exam.attempts.map(a => a.studentId)
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, fullName: true }
  })
  const nameMap = new Map(users.map(u => [u.id, u.fullName]))

  const attemptsCount = exam.attempts.length
  let average = 0
  let highest = 0
  let lowest = 0

  if (attemptsCount > 0) {
    const percentages = exam.attempts.map(a => a.percentage)
    average = percentages.reduce((a, b) => a + b, 0) / attemptsCount
    highest = Math.max(...percentages)
    lowest = Math.min(...percentages)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">آمار آزمون: {exam.title}</h1>
        <Link href="/admin/simple-exams" className="text-primary hover:underline">بازگشت</Link>
      </div>

      {/* کارت‌های آماری */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center">
          <p className="text-muted-foreground text-sm">تعداد شرکت‌کنندگان</p>
          <p className="text-3xl font-bold text-primary mt-2">{attemptsCount} نفر</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center">
          <p className="text-muted-foreground text-sm">میانگین درصد</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{Math.round(average * 100) / 100}%</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center">
          <p className="text-muted-foreground text-sm">بالاترین درصد</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{highest}%</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center">
          <p className="text-muted-foreground text-sm">پایین‌ترین درصد</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{lowest}%</p>
        </div>
      </div>

      {/* جدول دانش‌آموزان */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mt-8">
        <table className="w-full text-right">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 font-medium">رتبه</th>
              <th className="px-6 py-3 font-medium">نام دانش‌آموز</th>
              <th className="px-6 py-3 font-medium">درصد</th>
              <th className="px-6 py-3 font-medium">صحیح</th>
              <th className="px-6 py-3 font-medium">غلط</th>
              <th className="px-6 py-3 font-medium">تاریخ ثبت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {exam.attempts.map((attempt, index) => (
              <tr key={attempt.id} className="hover:bg-muted/50 transition">
                <td className="px-6 py-4 font-bold text-muted-foreground">{index + 1}</td>
                <td className="px-6 py-4">{nameMap.get(attempt.studentId) || "ناشناس"}</td>
                <td className="px-6 py-4 font-bold text-primary">{attempt.percentage}%</td>
                <td className="px-6 py-4 text-green-600">{attempt.correctCount}</td>
                <td className="px-6 py-4 text-red-600">{attempt.incorrectCount}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground" dir="ltr">
                  {new Date(attempt.submittedAt).toLocaleDateString('fa-IR')}
                </td>
              </tr>
            ))}
            {exam.attempts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  هنوز هیچ دانش‌آموزی در این آزمون شرکت نکرده است.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}