import { auth } from "@/auth"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function StudentDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">داشبورد دانش‌آموز</h1>
      <p className="text-muted-foreground">به پلتفرم آموزشی سحا خوش آمدید، {session.user.name}.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-2">آزمون‌های تستی</h2>
          <p className="text-muted-foreground mb-4">در آزمون‌های آپلودی شرکت کنید و کارنامه خود را ببینید.</p>
          <Link href="/student/simple-exams" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition">
            مشاهده آزمون‌های من
          </Link>
        </div>
      </div>
    </div>
  )
}