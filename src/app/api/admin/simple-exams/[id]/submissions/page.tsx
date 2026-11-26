import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

export default async function ExamSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) redirect("/login")

  const exam = await prisma.simpleExam.findUnique({
    where: { id },
    include: {
      attempts: {
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

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">نتایج آزمون: {exam.title}</h1>
          <p className="text-sm text-muted-foreground">{exam.attempts.length} نفر شرکت کرده‌اند</p>
        </div>
        <div className="flex gap-3">
          {/* 👇 Form to toggle publishing 👇 */}
          <form action={async () => {
            "use server"
            await prisma.simpleExam.update({
              where: { id },
              data: { resultsPublished: !exam.resultsPublished }
            })
          }}>
            <button className={`px-4 py-2 rounded-lg text-white font-bold ${exam.resultsPublished ? 'bg-red-500' : 'bg-green-600'}`}>
              {exam.resultsPublished ? "لغو انتشار نتایج" : "انتشار نتایج برای دانش‌آموزان"}
            </button>
          </form>
          <Link href="/admin/simple-exams" className="px-4 py-2 border rounded-lg hover:bg-muted">بازگشت</Link>
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
            {exam.attempts.map((attempt, index) => (
              <tr key={attempt.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 text-muted-foreground">{index + 1}</td>
                <td className="px-6 py-4 font-medium">{nameMap.get(attempt.studentId) || "ناشناس"}</td>
                <td className="px-6 py-4 font-bold text-primary">{attempt.percentage}%</td>
                <td className="px-6 py-4 text-green-600">{attempt.correctCount}</td>
                <td className="px-6 py-4 text-red-600">{attempt.incorrectCount}</td>
                <td className="px-6 py-4 text-sm" dir="ltr">{new Date(attempt.submittedAt).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
            {exam.attempts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">هیچ دانش‌آموزی شرکت نکرده است.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}