
import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import AdminShell from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <AdminShell
      userName={session.user.name ?? "مدیر سیستم"}
      logout={
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
        >
          <Button
            type="submit"
            variant="ghost"
            className="h-11 w-full justify-start gap-3 text-danger hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-5 w-5" />
            خروج از حساب
          </Button>
        </form>
      }
    >
      {children}
    </AdminShell>
  )
}
