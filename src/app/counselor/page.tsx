import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function CounselorDashboard() {
  const session = await auth()
  
  const students = await prisma.studentProfile.findMany({
    where: { counselorId: session?.user?.id },
    include: {
      user: true,
      parents: { include: { user: true } }
    }
  })

  const studentsWithUnread = await Promise.all(
    students.map(async (student) => {
      const parentUserIds = student.parents.map((p) => p.userId)
      const participantIds = [student.userId, ...parentUserIds].filter(Boolean)

      const unreadCount = await prisma.message.count({
        where: {
          chat: { OR: [{ studentId: student.id }, { parentId: { in: student.parents.map((p) => p.id) } }] },
          senderId: { in: participantIds },
          readAt: null
        }
      })

      return { ...student, unreadCount }
    })
  )

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">لیست دانش‌آموزان</h2>
      
      {studentsWithUnread.length === 0 ? (
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
              <h3 className="font-bold text-lg">{s.user.fullName}</h3>
              <p className="text-sm text-muted-foreground dir-ltr text-right mt-2">{s.user.phone}</p>
              {s.unreadCount > 0 && (
                <span className="inline-block mt-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                  {s.unreadCount} پیام خوانده‌نشده
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}