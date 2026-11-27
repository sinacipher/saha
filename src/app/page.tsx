import { auth } from "@/auth"
import { getRoleDashboardPath } from "@/lib/role-routing"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const session = await auth()
  redirect(getRoleDashboardPath(session?.user?.role) ?? "/login")
}
