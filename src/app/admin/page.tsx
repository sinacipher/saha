import { prisma } from "@/lib/prisma"

export default async function AdminDashboardPage() {
  const [totalUsers, activeCounselors, students, parents, chats, unreadMessages] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "COUNSELOR", isActive: true } }),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { role: "PARENT", isActive: true } }),
    prisma.chat.count(),
    prisma.message.count({ where: { readAt: null } })
  ])

  const stats = [
    { label: "کل کاربران", value: totalUsers },
    { label: "مشاوران فعال", value: activeCounselors },
    { label: "دانش‌آموزان فعال", value: students },
    { label: "والدین فعال", value: parents },
    { label: "گفت‌وگوهای فعال", value: chats },
    { label: "پیام‌های خوانده‌نشده", value: unreadMessages }
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">داشبورد مدیریت</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
            <p className="mt-2 text-4xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}