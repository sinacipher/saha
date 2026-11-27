import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSimpleExamAttemptsByStudent } from "@/lib/simple-exam-performance"
import PerformanceDashboard, {
  type PerformanceStudent,
} from "@/components/performance/PerformanceDashboard"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminPerformancePage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const users = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      fullName: true,
      nationalId: true,
      phone: true,
    },
    orderBy: { fullName: "asc" },
  })

  const attemptsByStudent = await getSimpleExamAttemptsByStudent(
    users.map((user) => user.id),
  )

  const students: PerformanceStudent[] = users.map((user) => ({
    ...user,
    attempts: attemptsByStudent.get(user.id) ?? [],
  }))

  return (
    <PerformanceDashboard
      title="عملکرد تحصیلی دانش‌آموزان"
      description="گزارش کلی نتایج آزمون‌ها، میانگین عملکرد و جزئیات هر دانش‌آموز در تمام حساب‌های دانش‌آموزی."
      students={students}
      backHref="/admin"
      backLabel="بازگشت به داشبورد مدیریت"
      emptyMessage="هنوز حساب دانش‌آموزی ثبت نشده است."
    />
  )
}
