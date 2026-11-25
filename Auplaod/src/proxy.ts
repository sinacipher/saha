import { auth } from "@/auth"
import { getRoleDashboardPath } from "@/lib/role-routing"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role

  const isPublicRoute = nextUrl.pathname === "/login"

  // 👇 این خط را اضافه کنید تا APIها بلاک نشوند
  const isApiRoute = nextUrl.pathname.startsWith("/api")

  // اگر مسیر API است، کاری به آن نداشته باش (بگذار خودش مدیریت کند)
  if (isApiRoute) return NextResponse.next()

  // کاربر لاگین‌شده را مستقیماً به پنل نقش خودش هدایت کن
  if (isLoggedIn && (isPublicRoute || nextUrl.pathname === "/")) {
    const dashboardPath = getRoleDashboardPath(role)
    if (dashboardPath) {
      return NextResponse.redirect(new URL(dashboardPath, nextUrl))
    }
  }

  // صفحه لاگین برای کاربر خارج‌شده بدون تغییر باقی می‌ماند
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // اگر کاربر لاگین نیست، به صفحه ورود هدایت شود
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // محدودیت دسترسی بر اساس نقش
  if (nextUrl.pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl))
  }
  if (nextUrl.pathname.startsWith("/counselor") && role !== "COUNSELOR") {
    return NextResponse.redirect(new URL("/", nextUrl))
  }
  if (nextUrl.pathname.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/", nextUrl))
  }
  if (nextUrl.pathname.startsWith("/parent") && role !== "PARENT") {
    return NextResponse.redirect(new URL("/", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}