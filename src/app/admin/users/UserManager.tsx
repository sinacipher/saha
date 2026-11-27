"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  createUserAction,
  setUserActiveAction,
  updateUserAction,
} from "./actions"
import { useFeedback } from "@/components/feedback/FeedbackProvider"
import {
  Pencil,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
  X,
  Loader2,
} from "lucide-react"

type ManagedUser = {
  id: string
  role: "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"
  fullName: string | null
  nationalId: string
  phone: string
  isActive: boolean
  studentProfile?: { counselorId: string | null } | null
  parentProfile?: { studentId: string | null } | null
}

type CounselorOption = {
  id: string
  fullName: string | null
}

type StudentOption = {
  id: string
  fullName: string | null
  studentProfile: { id: string } | null
}

const formControlClass = "min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"

export default function UserManager({
  users,
  counselors,
  students,
}: {
  users: ManagedUser[]
  counselors: CounselorOption[]
  students: StudentOption[]
}) {
  const router = useRouter()
  const { notify, confirmAction } = useFeedback()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [selectedRole, setSelectedRole] = useState("COUNSELOR")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [activeUserId, setActiveUserId] = useState<string | null>(null)

  const getRoleName = (role: string) => {
    if (role === "ADMIN") return "مدیر"
    if (role === "COUNSELOR") return "مشاور"
    if (role === "STUDENT") return "دانش‌آموز"
    if (role === "PARENT") return "والدین"
    return role
  }

  const roleBadgeClass = (role: string) => {
    if (role === "ADMIN") return "bg-destructive/10 text-destructive"
    if (role === "COUNSELOR") return "bg-primary/10 text-primary"
    if (role === "STUDENT") return "bg-green-500/10 text-green-600"
    return "bg-secondary/10 text-secondary"
  }

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !normalizedQuery ||
      [
        user.fullName || "",
        user.nationalId,
        user.phone,
        getRoleName(user.role),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? user.isActive : !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const closeCreateModal = () => {
    setIsModalOpen(false)
    setError("")
    setSelectedRole("COUNSELOR")
  }

  const closeEditModal = () => {
    setEditingUser(null)
    setError("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await createUserAction(formData)

      if (result?.error) {
        setError(result.error)
        notify({
          title: "ثبت کاربر ناموفق بود",
          description: result.error,
          variant: "error",
        })
        return
      }

      closeCreateModal()
      notify({
        title: "کاربر با موفقیت ایجاد شد",
        variant: "success",
      })
      router.refresh()
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "خطای نامشخص هنگام ایجاد کاربر."
      setError(message)
      notify({ title: "خطای ثبت کاربر", description: message, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser) return

    setError("")
    setLoading(true)

    try {
      const result = await updateUserAction(
        editingUser.id,
        new FormData(event.currentTarget),
      )

      if (result.error) {
        setError(result.error)
        notify({
          title: "ذخیره تغییرات ناموفق بود",
          description: result.error,
          variant: "error",
        })
        return
      }

      closeEditModal()
      notify({
        title: "اطلاعات کاربر به‌روزرسانی شد",
        variant: "success",
      })
      router.refresh()
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : "خطای نامشخص هنگام ویرایش کاربر."
      setError(message)
      notify({ title: "خطای ویرایش کاربر", description: message, variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (user: ManagedUser) => {
    const nextActive = !user.isActive
    const accepted = await confirmAction({
      title: nextActive ? "فعال‌سازی حساب کاربری" : "غیرفعال‌سازی حساب کاربری",
      description: nextActive
        ? `حساب «${user.fullName || user.phone}» فعال شود؟`
        : `حساب «${user.fullName || user.phone}» غیرفعال شود؟ کاربر تا زمان فعال‌سازی مجدد نمی‌تواند وارد سامانه شود.`,
      confirmLabel: nextActive ? "فعال‌سازی" : "غیرفعال‌سازی",
      cancelLabel: "انصراف",
      danger: !nextActive,
    })

    if (!accepted) return

    setActiveUserId(user.id)

    try {
      const result = await setUserActiveAction(user.id, nextActive)

      if (result?.error) {
        notify({
          title: "تغییر وضعیت ناموفق بود",
          description: result.error,
          variant: "error",
        })
        return
      }

      notify({
        title: nextActive ? "حساب فعال شد" : "حساب غیرفعال شد",
        description: user.fullName || user.phone,
        variant: "success",
      })
      router.refresh()
    } catch (actionError) {
      notify({
        title: "خطا در تغییر وضعیت حساب",
        description:
          actionError instanceof Error
            ? actionError.message
            : "خطای نامشخص.",
        variant: "error",
      })
    } finally {
      setActiveUserId(null)
    }
  }

  const UserActions = ({ user }: { user: ManagedUser }) => (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <button
        type="button"
        onClick={() => {
          setError("")
          setEditingUser(user)
        }}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:bg-muted"
      >
        <Pencil className="h-4 w-4" />
        ویرایش
      </button>
      <button
        type="button"
        disabled={loading || activeUserId === user.id}
        onClick={() => void handleToggleActive(user)}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeUserId === user.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : user.isActive ? (
          <UserRoundX className="h-4 w-4" />
        ) : (
          <UserRoundCheck className="h-4 w-4" />
        )}
        {user.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setError("")
          setIsModalOpen(true)
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground transition hover:bg-primary/90"
      >
        <UserPlus className="h-5 w-5" />
        افزودن کاربر جدید
      </button>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="جستجو در نام، کد ملی یا موبایل"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="min-h-11 rounded-xl border border-border bg-background px-3 py-2"
          aria-label="فیلتر نقش"
        >
          <option value="ALL">همه نقش‌ها</option>
          <option value="ADMIN">مدیر</option>
          <option value="COUNSELOR">مشاور</option>
          <option value="STUDENT">دانش‌آموز</option>
          <option value="PARENT">والدین</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="min-h-11 rounded-xl border border-border bg-background px-3 py-2"
          aria-label="فیلتر وضعیت"
        >
          <option value="ALL">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="INACTIVE">غیرفعال</option>
        </select>
      </section>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>کاربران پیدا شده</span>
        <strong className="text-foreground">{filteredUsers.length} از {users.length}</strong>
      </div>

      {/* Mobile: full cards expose every field and action without hover or horizontal scrolling. */}
      <div className="space-y-3 md:hidden">
        {filteredUsers.map((user) => (
          <article
            key={user.id}
            className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words font-bold">
                  {user.fullName || "بدون نام"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getRoleName(user.role)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  user.isActive
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {user.isActive ? "فعال" : "غیرفعال"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted/40 p-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">کد ملی</span>
                <span className="break-all text-sm font-medium" dir="ltr">
                  {user.nationalId}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">شماره موبایل</span>
                <span className="break-all text-sm font-medium" dir="ltr">
                  {user.phone}
                </span>
              </div>
            </div>

            <UserActions user={user} />
          </article>
        ))}
        {filteredUsers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            هیچ کاربری با این مشخصات یافت نشد.
          </div>
        )}
      </div>

      {/* Desktop: retain the table, but allow deliberate horizontal scrolling on smaller laptops. */}
      <div className="hidden overflow-x-auto rounded-2xl border border-border bg-card shadow-sm md:block">
        <table className="w-full min-w-[950px] text-right">
          <thead className="bg-muted">
            <tr>
              <th className="whitespace-nowrap px-5 py-3 font-medium">نام و نام خانوادگی</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">نقش</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">کد ملی</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">شماره موبایل</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">وضعیت</th>
              <th className="whitespace-nowrap px-5 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="transition hover:bg-muted/40">
                <td className="px-5 py-4 font-medium">{user.fullName || "بدون نام"}</td>
                <td className="px-5 py-4">
                  <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClass(user.role)}`}>
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-left" dir="ltr">{user.nationalId}</td>
                <td className="whitespace-nowrap px-5 py-4 text-left" dir="ltr">{user.phone}</td>
                <td className="px-5 py-4">
                  <span className={user.isActive ? "text-sm font-bold text-green-600" : "text-sm font-bold text-destructive"}>
                    {user.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <UserActions user={user} />
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                  هیچ کاربری با این مشخصات یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex min-h-full items-start justify-center py-3 sm:items-center">
            <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h3 className="text-xl font-bold">افزودن کاربر جدید</h3>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  aria-label="بستن"
                  className="rounded-lg p-2 transition hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-5">
                {error && (
                  <div role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FormField label="نقش کاربر">
                    <select
                      name="role"
                      value={selectedRole}
                      onChange={(event) => setSelectedRole(event.target.value)}
                      className={formControlClass}
                    >
                      <option value="COUNSELOR">مشاور</option>
                      <option value="STUDENT">دانش‌آموز</option>
                      <option value="PARENT">والدین</option>
                      <option value="ADMIN">مدیر</option>
                    </select>
                  </FormField>

                  <FormField label="نام و نام خانوادگی">
                    <input name="fullName" required type="text" className={formControlClass} />
                  </FormField>

                  <FormField label="کد ملی">
                    <input name="nationalId" required type="text" inputMode="numeric" className={`${formControlClass} text-left`} dir="ltr" />
                  </FormField>

                  <FormField label="شماره موبایل">
                    <input name="phone" required type="text" inputMode="tel" placeholder="09..." className={`${formControlClass} text-left`} dir="ltr" />
                  </FormField>

                  {selectedRole === "STUDENT" && (
                    <FormField label="مشاور مربوطه (اختیاری)">
                      <select name="counselorId" className={formControlClass}>
                        <option value="">بدون مشاور</option>
                        {counselors.map((counselor) => (
                          <option key={counselor.id} value={counselor.id}>
                            {counselor.fullName || "مشاور بدون نام"}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  {selectedRole === "PARENT" && (
                    <FormField label="دانش‌آموز مربوطه (اختیاری)">
                      <select name="studentId" className={formControlClass}>
                        <option value="">بدون دانش‌آموز</option>
                        {students.filter((student) => student.studentProfile).map((student) => (
                          <option key={student.studentProfile!.id} value={student.studentProfile!.id}>
                            {student.fullName || "دانش‌آموز بدون نام"}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                    <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                      {loading ? "در حال ثبت..." : "ثبت کاربر"}
                    </button>
                    <button type="button" onClick={closeCreateModal} className="min-h-11 rounded-xl bg-muted px-4 py-2 font-bold transition hover:bg-muted/80">
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex min-h-full items-start justify-center py-3 sm:items-center">
            <section className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h3 className="text-xl font-bold">ویرایش کاربر</h3>
                <button
                  type="button"
                  onClick={closeEditModal}
                  aria-label="بستن"
                  className="rounded-lg p-2 transition hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto p-5">
                {error && (
                  <div role="alert" className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-4">
                  <FormField label="نام و نام خانوادگی">
                    <input name="fullName" required defaultValue={editingUser.fullName || ""} className={formControlClass} />
                  </FormField>

                  <FormField label="کد ملی">
                    <input name="nationalId" required defaultValue={editingUser.nationalId} inputMode="numeric" className={`${formControlClass} text-left`} dir="ltr" />
                  </FormField>

                  <FormField label="شماره موبایل">
                    <input name="phone" required defaultValue={editingUser.phone} inputMode="tel" className={`${formControlClass} text-left`} dir="ltr" />
                  </FormField>

                  {editingUser.role === "STUDENT" && (
                    <FormField label="مشاور مربوطه">
                      <select name="counselorId" defaultValue={editingUser.studentProfile?.counselorId || ""} className={formControlClass}>
                        <option value="">بدون مشاور</option>
                        {counselors.map((counselor) => (
                          <option key={counselor.id} value={counselor.id}>
                            {counselor.fullName || "مشاور بدون نام"}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  {editingUser.role === "PARENT" && (
                    <FormField label="دانش‌آموز مربوطه">
                      <select name="studentId" defaultValue={editingUser.parentProfile?.studentId || ""} className={formControlClass}>
                        <option value="">بدون دانش‌آموز</option>
                        {students.filter((student) => student.studentProfile).map((student) => (
                          <option key={student.studentProfile!.id} value={student.studentProfile!.id}>
                            {student.fullName || "دانش‌آموز بدون نام"}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}

                  <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                    <button type="submit" disabled={loading} className="min-h-11 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
                      {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
                    </button>
                    <button type="button" onClick={closeEditModal} className="min-h-11 rounded-xl bg-muted px-4 py-2 font-bold transition hover:bg-muted/80">
                      انصراف
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  )
}
