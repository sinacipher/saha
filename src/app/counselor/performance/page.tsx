import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSimpleExamAttemptsByStudent } from "@/lib/simple-exam-performance"
import PerformanceDashboard, {
  type PerformanceStudent,
} from "@/components/performance/PerformanceDashboard"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CounselorPerformancePage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "COUNSELOR") {
    redirect("/login")
  }

  const profiles = await prisma.studentProfile.findMany({
    where: { counselorId: session.user.id },
    select: {
      user: {
        select: {
          id: true,
          fullName: true,
          nationalId: true,
          phone: true,
        },
      },
    },
    orderBy: {
      user: { fullName: "asc" },
    },
  })

  const users = profiles.map((profile) => profile.user)
  const attemptsByStudent = await getSimpleExamAttemptsByStudent(
    users.map((user) => user.id),
  )

  const students: PerformanceStudent[] = users.map((user) => ({
    ...user,
    attempts: attemptsByStudent.get(user.id) ?? [],
  }))

  return (
    <PerformanceDashboard
      title="عملکرد تحصیلی دانش‌آموزان من"
      description="نتایج آزمون‌ها و روند عملکرد فقط دانش‌آموزانی که به حساب شما اختصاص داده شده‌اند."
      students={students}
      backHref="/counselor"
      backLabel="بازگشت به پنل مشاور"
      emptyMessage="هیچ دانش‌آموزی به شما اختصاص داده نشده است."
    />
  )
}
