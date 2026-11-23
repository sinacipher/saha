import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function CounselorAssessmentsPage() {
  const session = await auth()
  const [questions, assessments] = await Promise.all([
    prisma.question.count({ where: { authorId: session?.user?.id } }),
    prisma.assessment.count({ where: { creatorId: session?.user?.id } })
  ])

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">آزمون‌های من</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5"><div className="text-sm text-muted-foreground">سوالات من</div><div className="mt-2 text-3xl font-bold text-primary">{questions}</div></div>
        <div className="rounded-xl border border-border bg-card p-5"><div className="text-sm text-muted-foreground">آزمون‌های من</div><div className="mt-2 text-3xl font-bold text-primary">{assessments}</div></div>
      </div>
      <div className="flex flex-wrap gap-3"><Link href="/counselor/assessments/questions" className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">بانک سؤال</Link><Link href="/counselor/assessments/exams" className="rounded-lg border border-border px-4 py-2 font-medium">ساخت آزمون</Link><Link href="/counselor/assessments/analytics" className="rounded-lg border border-border px-4 py-2 font-medium">تحلیل‌ها</Link></div>
    </div>
  )
}
