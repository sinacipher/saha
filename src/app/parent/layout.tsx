import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session || session.user.role !== "PARENT") {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 flex-col border-l border-border bg-card">
        <div className="border-b border-border p-6">
          <h1 className="text-2xl font-bold text-primary">سحا | والدین</h1>
          <p className="mt-1 text-sm text-muted-foreground">{session.user.name}</p>
        </div>

        <nav className="flex-1 p-4">
          <Link href="/parent" className="block rounded-lg px-4 py-2 font-medium transition hover:bg-muted">
            گفت‌وگو با مشاور
          </Link>
          <Link href="/parent/assessments" className="block rounded-lg px-4 py-2 font-medium transition hover:bg-muted">
            نتایج فرزند
          </Link>
          <Link href="/parent/assessments/analytics" className="block rounded-lg px-4 py-2 font-medium transition hover:bg-muted">
            تحلیل فرزند
          </Link>
        </nav>

        <div className="border-t border-border p-4">
          <form action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}>
            <button className="w-full rounded-lg px-4 py-2 text-right font-medium text-destructive transition hover:bg-destructive/10">
              خروج از حساب
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
