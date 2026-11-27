
"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer } from "@/components/ui/drawer"
import { MobileTopBar } from "@/components/ui/mobile-top-bar"

import type { ReactNode } from "react"

interface AdminShellProps {
  children: ReactNode
  userName: string
  logout: ReactNode
}

const navigation = [
  {
    label: "داشبورد",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "مدیریت کاربران",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "همه گفت‌وگوها",
    href: "/admin/chats",
    icon: MessageSquare,
  },
  {
    label: "آزمون‌های ساده",
    href: "/admin/simple-exams",
    icon: FileText,
  },
]

export default function AdminShell({
  children,
  userName,
  logout,
}: AdminShellProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const getPageTitle = () => {
    const current = navigation.find(
      (item) =>
        item.href === "/admin"
          ? pathname === item.href
          : pathname === item.href ||
            pathname.startsWith(`${item.href}/`)
    )

    return current?.label ?? "پنل مدیریت"
  }

  const renderNavigation = (mobile = false) => (
    <nav aria-label="منوی مدیریت" className="space-y-1.5">
      {navigation.map((item) => {
        const Icon = item.icon

        const active =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={mobile ? closeDrawer : undefined}
            aria-current={active ? "page" : undefined}
            className={`
              group relative flex min-h-11 items-center gap-3
              rounded-xl px-4 py-3 text-sm font-medium
              transition-colors duration-150
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-primary
              focus-visible:ring-offset-2
              ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            {active && (
              <span
                aria-hidden="true"
                className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-primary"
              />
            )}

            <Icon
              className={`h-5 w-5 shrink-0 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              }`}
            />

            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )

  const renderLogout = () => logout

  return (
    <div
      dir="rtl"
      className="flex min-h-screen bg-background text-foreground"
    >
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-border bg-card md:flex">
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-xl font-black text-primary">
                سحا
              </h1>
              <p className="text-xs text-muted-foreground">
                پنل مدیریت
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-surface-sunken p-3">
            <p className="text-xs text-muted-foreground">
              خوش آمدید
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">
              {userName || "مدیر سیستم"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="mb-3 px-4 text-[11px] font-semibold tracking-wider text-muted-foreground">
            منوی اصلی
          </p>

          {renderNavigation()}
        </div>

        <div className="border-t border-border p-4">
          {renderLogout()}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <MobileTopBar
          title={getPageTitle()}
          subtitle="پنل مدیریت سحا"
          onMenuClick={() => setDrawerOpen(true)}
        />

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title="پنل مدیریت سحا"
        side="right"
      >
        <div className="mb-6 rounded-xl bg-surface-sunken p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                خوش آمدید
              </p>
              <p className="truncate text-sm font-semibold">
                {userName || "مدیر سیستم"}
              </p>
            </div>
          </div>
        </div>

        {renderNavigation(true)}

        <div className="mt-8 border-t border-border pt-4">
          {renderLogout()}
        </div>
      </Drawer>
    </div>
  )
}
