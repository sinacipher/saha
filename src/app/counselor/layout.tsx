import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function CounselorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== "COUNSELOR") {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 border-l border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">سحا | مشاور</h1>
          <p className="text-sm text-muted-foreground mt-1">{session.user.name}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/counselor" className="block px-4 py-2 rounded-lg hover:bg-muted font-medium transition">
            دانش‌آموزان من
          </Link>
          
          {/* 👇 لینک جدید برای مشاور 👇 */}
          <Link href="/counselor/simple-exams" className="block px-4 py-2 rounded-lg hover:bg-muted font-medium transition text-primary font-bold">
            ساخت آزمون تستی (فایل)
          </Link>
          {/* 👆 -------------------- 👆 */}
        </nav>

        <div className="p-4 border-t border-border">
          <form action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}>
            <button className="w-full text-right px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg font-medium transition">
              خروج از حساب
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}