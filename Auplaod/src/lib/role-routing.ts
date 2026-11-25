export type Role = "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"

export function getRoleDashboardPath(role: Role | string | undefined): string | null {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "COUNSELOR":
      return "/counselor"
    case "STUDENT":
      return "/student"
    case "PARENT":
      return "/parent"
    default:
      return null
  }
}
