import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import DashboardShell from "@/components/dashboard/dashboard-shell"

export default async function CounselorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== "COUNSELOR") {
    redirect("/login")
  }

  async function logoutAction() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <DashboardShell
      role="COUNSELOR"
      userName={session.user.name ?? "مشاور"}
      logoutAction={logoutAction}
    >
      {children}
    </DashboardShell>
  )
}