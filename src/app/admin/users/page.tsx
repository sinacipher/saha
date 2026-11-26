import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

const PAGE_SIZE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const params = await searchParams
  const rawPage = Number(params.page ?? "1")
  const currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  const skip = (currentPage - 1) * PAGE_SIZE

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: {
        studentProfile: { include: { counselor: true } },
        parentProfile: { include: { student: { include: { user: true } } } },
      },
    }),
    prisma.user.count(),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const startItem = totalCount === 0 ? 0 : skip + 1
  const endItem = Math.min(skip + PAGE_SIZE, totalCount)

  const getRoleLabel = (role: string) => {
    if (role === "ADMIN") return "مدیر"
    if (role === "COUNSELOR") return "مشاور"
    if (role === "STUDENT") return "دانش‌آموز"
    if (role === "PARENT") return "والدین"
    return role
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">مدیریت کاربران</h2>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 font-medium">نام و نام خانوادگی</th>
              <th className="px-6 py-3 font-medium">نقش</th>
              <th className="px-6 py-3 font-medium">کد ملی</th>
              <th className="px-6 py-3 font-medium">شماره موبایل</th>
              <th className="px-6 py-3 font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50 transition">
                <td className="px-6 py-4">{user.fullName}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 dir-ltr text-right">{user.nationalId}</td>
                <td className="px-6 py-4 dir-ltr text-right">{user.phone}</td>
                <td className="px-6 py-4">
                  <span className={user.isActive ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                    {user.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  هیچ کاربری یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            نمایش {startItem} تا {endItem} از {totalCount} کاربر
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`?page=${Math.max(1, safePage - 1)}`}
              className={`px-3 py-1.5 rounded-lg border border-border text-sm transition ${
                safePage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
              aria-disabled={safePage <= 1}
            >
              قبلی
            </Link>
            <span className="px-3 py-1.5 text-sm font-medium">
              صفحه {safePage} از {totalPages}
            </span>
            <Link
              href={`?page=${Math.min(totalPages, safePage + 1)}`}
              className={`px-3 py-1.5 rounded-lg border border-border text-sm transition ${
                safePage >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-muted"
              }`}
              aria-disabled={safePage >= totalPages}
            >
              بعدی
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}