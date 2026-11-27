import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getSimpleExamAttemptsByStudent } from "@/lib/simple-exam-performance"
import PerformanceDashboard, {
  type PerformanceStudent,
} from "@/components/performance/PerformanceDashboard"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ParentPerformancePage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "PARENT") {
    redirect("/login")
  }

  const profile = await prisma.parentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      student: {
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
      },
    },
  })

  const child = profile?.student?.user

  if (!child) {
    return (
      <PerformanceDashboard
        title="کارنامه و عملکرد دانش‌آموز"
        description="نتایج آزمون‌ها و گزارش عملکرد دانش‌آموز متصل به حساب والدین."
        students={[]}
        backHref="/parent"
        backLabel="بازگشت به پنل والدین"
        emptyMessage="هنوز دانش‌آموزی به حساب والدین متصل نشده است. برای اتصال، با مدیر سامانه تماس بگیرید."
      />
    )
  }

  const attemptsByStudent = await getSimpleExamAttemptsByStudent([child.id], { onlyPublished: true })

  const students: PerformanceStudent[] = [
    {
      ...child,
      attempts: attemptsByStudent.get(child.id) ?? [],
    },
  ]

  return (
    <PerformanceDashboard
      title="کارنامه و عملکرد فرزند"
      description="نتایج تمام آزمون‌های ثبت‌شده، میانگین درصد و جزئیات پاسخ‌های صحیح، غلط و بدون پاسخ فرزند شما."
      students={students}
      backHref="/parent"
      backLabel="بازگشت به پنل والدین"
      emptyMessage="برای این دانش‌آموز هنوز نتیجه آزمونی ثبت نشده است."
    />
  )
}
