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
  BookOpenCheck,
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
    { label: "آزمون‌های من", href: "/student/simple-exams", icon: BookOpenCheck },
    { label: "گفت‌وگو با مشاور", href: "/student/chat", icon: MessageSquare },
  ],
  PARENT: [
    { label: "داشبورد", href: "/parent", icon: LayoutDashboard },
    { label: "کارنامه و عملکرد فرزند", href: "/parent/performance", icon: TrendingUp },
    { label: "گفت‌وگو با مشاور", href: "/parent/chat", icon: MessageSquare },
  ],
}

const roleTitles: Record<Role, string> = {
  ADMIN: "مدیریت",
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
  const dashboardPath = `/${role.toLowerCase()}`

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const isActive = (href: string) => {
    if (href === dashboardPath) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="باز کردن منوی اصلی"
          aria-expanded={isOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight text-primary">ریمو</span>
        </div>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] md:min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-l border-border bg-card md:flex">
          <SidebarContent
            role={role}
            userName={userName}
            items={items}
            isActive={isActive}
            logoutAction={logoutAction}
          />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="بستن منوی اصلی"
            onClick={() => setIsOpen(false)}
            className="remo-backdrop-enter absolute inset-0 h-full w-full bg-slate-950/55 backdrop-blur-[2px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`منوی ${roleTitles[role]}`}
            className="remo-drawer-enter absolute inset-y-0 right-0 flex w-[86%] max-w-[380px] flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <span className="font-black text-primary">ریمو</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="بستن منو"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border transition hover:bg-muted"
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
  onNavigate?: () => void
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
      <div className="border-b border-border px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-primary">ریمو</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">سامانه هوشمند مشاوره تحصیلی</p>
          </div>
        </div>
      </div>

      <div className="m-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-sunken p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {role === "ADMIN" ? <ShieldCheck className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">پنل {roleTitles[role]}</p>
          <p className="mt-1 truncate text-sm font-bold">{userName || roleTitles[role]}</p>
        </div>
      </div>

      <nav aria-label="منوی اصلی" className="flex-1 space-y-1.5 px-4 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all duration-150 ${
                active
                  ? "bg-primary/10 font-bold text-primary shadow-sm shadow-primary/5"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {active && <span className="absolute bottom-2 right-0 top-2 w-1 rounded-l-full bg-primary" />}
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-5 border-t border-border p-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <LogOut className="h-5 w-5" />
            خروج از حساب
          </button>
        </form>
      </div>
    </>
  )
}
