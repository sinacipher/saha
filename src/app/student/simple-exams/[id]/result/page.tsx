import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"

export default async function SimpleExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const attempt = await prisma.simpleExamAttempt.findUnique({
    where: { examId_studentId: { examId: id, studentId: session.user.id } },
    include: { exam: true }
  })

  if (!attempt) notFound()

  // 👇 SECURITY CHECK: Prevent viewing results if not published yet 👇
  if (!attempt.exam.resultsPublished) {
    return (
      <div className="max-w-2xl mx-auto p-10 mt-10 text-center bg-card border rounded-xl shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-muted-foreground">پاسخ شما با موفقیت ثبت شد</h1>
        <p>نتایج این آزمون هنوز توسط مشاور یا مدیر منتشر نشده است. لطفاً بعداً مراجعه کنید.</p>
        <Link href="/student/simple-exams" className="inline-block bg-primary text-white px-6 py-2 rounded-lg">بازگشت</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center space-y-6">
        <h1 className="text-3xl font-bold text-primary">کارنامه آزمون</h1>
        <h2 className="text-xl font-bold">{attempt.exam.title}</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm text-green-700">پاسخ صحیح</p>
            <p className="text-2xl font-bold text-green-600">{attempt.correctCount}</p>
          </div>
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-700">پاسخ غلط</p>
            <p className="text-2xl font-bold text-red-600">{attempt.incorrectCount}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <p className="text-sm text-gray-700">بدون پاسخ</p>
            <p className="text-2xl font-bold text-gray-600">{attempt.unansweredCount}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-700">درصد نهایی</p>
            <p className="text-2xl font-bold text-blue-600">{attempt.percentage}%</p>
          </div>
        </div>

        <div className="text-lg font-bold bg-muted p-4 rounded-lg">
          نمره خام: {attempt.rawScore} از {attempt.exam.questionCount * 3}
        </div>

        <Link href="/student/simple-exams" className="block bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90 transition">
          بازگشت به لیست آزمون‌ها
        </Link>
      </div>
    </div>
  )
}