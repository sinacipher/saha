import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function CounselorDashboard() {
  const session = await auth()
  
  // گرفتن دانش‌آموزانی که مشاورشان کاربر فعلی است
  const students = await prisma.studentProfile.findMany({
    where: { counselorId: session?.user?.id },
    include: { user: true, parents: { include: { user: true } } }
  })

  const studentsWithUnread = await Promise.all(students.map(async (student) => {
    const parentIds = student.parents.map((parent) => parent.userId)
    const unreadCount = await prisma.message.count({
      where: {
        readAt: null,
        senderId: { in: [student.userId, ...parentIds] },
        chat: {
          counselorId: session?.user?.id,
          OR: [
            { studentId: student.userId },
            ...parentIds.map((parentId) => ({ parentId }))
          ]
        }
      }
    })

    return { ...student, unreadCount }
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">لیست دانش‌آموزان</h2>
      
      {students.length === 0 ? (
        <div className="bg-card p-6 rounded-xl border border-border text-muted-foreground">
          در حال حاضر هیچ دانش‌آموزی به شما اختصاص داده نشده است.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studentsWithUnread.map((s) => (
            <Link 
              key={s.id} 
              href={`/counselor/students/${s.userId}`} 
              className="bg-card p-5 rounded-xl border border-border shadow-sm hover:border-primary transition block"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-lg">{s.user.fullName}</h3>
                {s.unreadCount > 0 && (
                  <span className="min-w-6 rounded-full bg-primary px-2 py-1 text-center text-xs font-bold text-primary-foreground">
                    {s.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground dir-ltr text-right mt-2">{s.user.phone}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}