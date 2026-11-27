
import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard/dashboard-shell"

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== "PARENT") {
    redirect("/login")
  }

  async function logoutAction() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <DashboardShell
      role="PARENT"
      userName={session.user.name ?? "والدین"}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  )
}
