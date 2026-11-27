
import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard/dashboard-shell"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  async function logoutAction() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <DashboardShell
      role="STUDENT"
      userName={session.user.name ?? "دانش‌آموز"}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  )
}
