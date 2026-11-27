"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  GraduationCap,
  TrendingUp,
} from "lucide-react"

type Role = "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"

type NavigationItem = {
  label: string
  href: string
  icon: React.ElementType
}

type DashboardShellProps = {
  role: Role
  userName: string
  children: React.ReactNode
  logoutAction: () => void
}

const navigation: Record<Role, NavigationItem[]> = {
  ADMIN: [
    { label: "داشبورد", href: "/admin", icon: LayoutDashboard },
    { label: "مدیریت کاربران", href: "/admin/users", icon: Users },
    { label: "همه گفت‌وگوها", href: "/admin/chats", icon: MessageSquare },
    { label: "مدیریت آزمون‌ها", href: "/admin/simple-exams", icon: FileText },
    { label: "عملکرد تحصیلی", href: "/admin/performance", icon: TrendingUp },
  ],
  COUNSELOR: [
    { label: "دانش‌آموزان من", href: "/counselor", icon: Users },
    { label: "آزمون‌ها و نتایج", href: "/counselor/simple-exams", icon: FileText },
    { label: "عملکرد دانش‌آموزان", href: "/counselor/performance", icon: TrendingUp },
  ],
  STUDENT: [
    { label: "داشبورد", href: "/student", icon: LayoutDashboard },
    { label: "آزمون‌های من", href: "/student/simple-exams", icon: FileText },
    { label: "گفت‌وگو با مشاور", href: "/student/chat", icon: MessageSquare },
  ],
  PARENT: [
    { label: "داشبورد", href: "/parent", icon: LayoutDashboard },
    { label: "کارنامه و عملکرد فرزند", href: "/parent/performance", icon: TrendingUp },
    { label: "گفت‌وگو با مشاور", href: "/parent/chat", icon: MessageSquare },
  ],
}

const roleTitles: Record<Role, string> = {
  ADMIN: "مدیریت سحا",
  COUNSELOR: "مشاور",
  STUDENT: "دانش‌آموز",
  PARENT: "والدین",
}

export default function DashboardShell({
  role,
  userName,
  children,
  logoutAction,
}: DashboardShellProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const items = navigation[role]

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen])

  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href === `/${role.toLowerCase()}`) return false
    return pathname.startsWith(`${href}/`)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="باز کردن منو"
          aria-expanded={isOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-muted"
        >
          <Menu className="h-6 w-6" />
        </button>
        <span className="text-lg font-bold text-primary">سحا</span>
        <div className="h-10 w-10" />
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-border bg-card md:flex">
          <SidebarContent
            role={role}
            userName={userName}
            items={items}
            isActive={isActive}
            logoutAction={logoutAction}
            onNavigate={() => setIsOpen(false)}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="بستن منو"
            onClick={() => setIsOpen(false)}
            className="saha-backdrop-enter absolute inset-0 h-full w-full bg-black/50 backdrop-blur-[2px]"
          />
          <aside className="saha-drawer-enter absolute inset-y-0 right-0 flex w-[85%] max-w-[380px] flex-col bg-white text-gray-900 shadow-2xl">
            <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-gray-200 px-5">
              <h2 className="text-base font-bold">پنل {roleTitles[role]}</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="بستن منو"
                className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SidebarContent
                role={role}
                userName={userName}
                items={items}
                isActive={isActive}
                logoutAction={logoutAction}
                onNavigate={() => setIsOpen(false)}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

type SidebarContentProps = {
  role: Role
  userName: string
  items: NavigationItem[]
  isActive: (href: string) => boolean
  logoutAction: () => void
  onNavigate: () => void
}

function SidebarContent({
  role,
  userName,
  items,
  isActive,
  logoutAction,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-extrabold text-primary">سحا</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          پنل {roleTitles[role]}
        </p>
      </div>

      <div className="m-4 flex items-center gap-3 rounded-2xl bg-muted/70 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
          {role === "ADMIN" ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <GraduationCap className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">خوش آمدید</p>
          <p className="truncate font-bold">{userName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-orange-50 font-bold text-orange-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {active && (
                <span className="absolute bottom-2 right-0 top-2 w-1 rounded-l-full bg-orange-600" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 border-t border-gray-200 p-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            خروج از حساب
          </button>
        </form>
      </div>
    </>
  )
}
