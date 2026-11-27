import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard/dashboard-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  async function logoutAction() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <DashboardShell
      role="ADMIN"
      userName={session.user.name ?? "مدیر"}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  )
}