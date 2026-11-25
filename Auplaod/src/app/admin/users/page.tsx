import { prisma } from "@/lib/prisma"
import UserManager from "./UserManager"

export default async function UsersPage() {
  // گرفتن لیست همه کاربران برای نمایش
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      studentProfile: { include: { counselor: true } },
      parentProfile: { include: { student: { include: { user: true } } } }
    }
  })

  // گرفتن لیست مشاوران برای منوی انتخاب
  const counselors = await prisma.user.findMany({
    where: { role: "COUNSELOR", isActive: true }
  })

  // گرفتن لیست دانش‌آموزان برای منوی انتخاب (موقع ثبت والد)
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    include: { studentProfile: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">مدیریت کاربران</h2>
      </div>
      
      <UserManager 
        users={users} 
        counselors={counselors} 
        students={students} 
      />
    </div>
  )
}