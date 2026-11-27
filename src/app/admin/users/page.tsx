import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import UserManager from "./UserManager"

const PAGE_SIZE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  const params = await searchParams

  const rawPage = Number(params.page ?? "1")
  const currentPage =
    Number.isFinite(rawPage) && rawPage >= 1
      ? Math.floor(rawPage)
      : 1

  const skip = (currentPage - 1) * PAGE_SIZE

  const [users, totalCount, counselors, students] =
    await Promise.all([
      prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          role: true,
          fullName: true,
          nationalId: true,
          phone: true,
          isActive: true,

          studentProfile: {
            select: {
              counselorId: true,
            },
          },

          parentProfile: {
            select: {
              studentId: true,
            },
          },
        },
      }),

      prisma.user.count(),

      prisma.user.findMany({
        where: {
          role: "COUNSELOR",
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
        },
        orderBy: {
          fullName: "asc",
        },
      }),

      prisma.user.findMany({
        where: {
          role: "STUDENT",
        },
        select: {
          id: true,
          fullName: true,
          studentProfile: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          fullName: "asc",
        },
      }),
    ])

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / PAGE_SIZE)
  )

  const safePage = Math.min(currentPage, totalPages)

  const startItem =
    totalCount === 0 ? 0 : skip + 1

  const endItem = Math.min(
    skip + PAGE_SIZE,
    totalCount
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          مدیریت کاربران
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          مدیریت اطلاعات، نقش‌ها و وضعیت حساب‌های کاربری
        </p>
      </div>

      <UserManager
        users={users}
        counselors={counselors}
        students={students}
      />

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            نمایش {startItem} تا {endItem} از {totalCount} کاربر
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={`?page=${Math.max(1, safePage - 1)}`}
              className={`rounded-lg border border-border px-3 py-1.5 text-sm transition ${
                safePage <= 1
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-muted"
              }`}
              aria-disabled={safePage <= 1}
            >
              قبلی
            </Link>

            <span className="px-3 py-1.5 text-sm font-medium">
              صفحه {safePage} از {totalPages}
            </span>

            <Link
              href={`?page=${Math.min(
                totalPages,
                safePage + 1
              )}`}
              className={`rounded-lg border border-border px-3 py-1.5 text-sm transition ${
                safePage >= totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:bg-muted"
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