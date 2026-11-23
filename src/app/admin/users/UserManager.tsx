"use client"

import { useState } from "react"
import { createUserAction, setUserActiveAction, updateUserAction } from "./actions"

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

export default function UserManager({ users, counselors, students }: {
  users: ManagedUser[]
  counselors: Array<{ id: string; fullName: string | null }>
  students: Array<{ id: string; fullName: string | null; studentProfile: { id: string } | null }>
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [selectedRole, setSelectedRole] = useState("COUNSELOR")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const res = await createUserAction(formData)

    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setIsModalOpen(false)
    }
  }

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser) return

    setError("")
    setLoading(true)
    const result = await updateUserAction(editingUser.id, new FormData(event.currentTarget))
    setLoading(false)

    if (result.error) setError(result.error)
    if (result.success) setEditingUser(null)
  }

  const handleToggleActive = async (user: ManagedUser) => {
    setLoading(true)
    await setUserActiveAction(user.id, !user.isActive)
    setLoading(false)
  }

  const getRoleName = (role: string) => {
    if (role === "ADMIN") return "مدیر"
    if (role === "COUNSELOR") return "مشاور"
    if (role === "STUDENT") return "دانش‌آموز"
    if (role === "PARENT") return "والدین"
    return role
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredUsers = users.filter((user) => {
    const matchesSearch = !normalizedQuery || [
      user.fullName || "",
      user.nationalId,
      user.phone,
      getRoleName(user.role)
    ].some((value) => value.toLowerCase().includes(normalizedQuery))

    const matchesRole = roleFilter === "ALL" || user.role === roleFilter
    const matchesStatus = statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? user.isActive : !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-4">
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition"
      >
        + افزودن کاربر جدید
      </button>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row">
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="جستجو در نام، کد ملی یا موبایل"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2">
          <option value="ALL">همه نقش‌ها</option>
          <option value="ADMIN">مدیر</option>
          <option value="COUNSELOR">مشاور</option>
          <option value="STUDENT">دانش‌آموز</option>
          <option value="PARENT">والدین</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2">
          <option value="ALL">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="INACTIVE">غیرفعال</option>
        </select>
      </div>

      {/* جدول کاربران */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 font-medium">نام و نام خانوادگی</th>
              <th className="px-6 py-3 font-medium">نقش</th>
              <th className="px-6 py-3 font-medium">کد ملی</th>
              <th className="px-6 py-3 font-medium">شماره موبایل</th>
              <th className="px-6 py-3 font-medium">وضعیت</th>
              <th className="px-6 py-3 font-medium">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50 transition">
                <td className="px-6 py-4">{user.fullName}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === "ADMIN" ? "bg-destructive/10 text-destructive" :
                    user.role === "COUNSELOR" ? "bg-primary/10 text-primary" :
                    user.role === "STUDENT" ? "bg-green-500/10 text-green-600" :
                    "bg-secondary/10 text-secondary"
                  }`}>
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td className="px-6 py-4 dir-ltr text-right">{user.nationalId}</td>
                <td className="px-6 py-4 dir-ltr text-right">{user.phone}</td>
                <td className="px-6 py-4">
                  <span className={user.isActive ? "text-green-600 text-sm" : "text-destructive text-sm"}>
                    {user.isActive ? "فعال" : "غیرفعال"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setError(""); setEditingUser(user) }}
                      className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted"
                    >
                      ویرایش
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleToggleActive(user)}
                      className="rounded-lg border border-border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
                    >
                      {user.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  هیچ کاربری یافت نشد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* مُدال افزودن کاربر */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-xl font-bold">افزودن کاربر جدید</h3>
            
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">نقش کاربر</label>
                <select 
                  name="role" 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="COUNSELOR">مشاور</option>
                  <option value="STUDENT">دانش‌آموز</option>
                  <option value="PARENT">والدین</option>
                  <option value="ADMIN">مدیر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">نام و نام خانوادگی</label>
                <input name="fullName" required type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm mb-1">کد ملی</label>
                <input name="nationalId" required type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none dir-ltr" />
              </div>

              <div>
                <label className="block text-sm mb-1">شماره موبایل</label>
                <input name="phone" required type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none dir-ltr" placeholder="09..." />
              </div>

              {/* فیلدهای شرطی */}
              {selectedRole === "STUDENT" && (
                <div>
                  <label className="block text-sm mb-1">مشاور مربوطه (اختیاری)</label>
                  <select name="counselorId" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">بدون مشاور</option>
                    {counselors.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedRole === "PARENT" && (
                <div>
                  <label className="block text-sm mb-1">دانش‌آموز مربوطه (اختیاری)</label>
                  <select name="studentId" className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none">
                    <option value="">بدون دانش‌آموز</option>
                    {students.map((s) => (
                      <option key={s.studentProfile?.id} value={s.studentProfile?.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {loading ? "در حال ثبت..." : "ثبت کاربر"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:bg-muted/80 transition"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-xl font-bold">ویرایش کاربر</h3>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">نام و نام خانوادگی</label>
                <input name="fullName" required defaultValue={editingUser.fullName || ""} className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm">کد ملی</label>
                <input name="nationalId" required defaultValue={editingUser.nationalId} className="dir-ltr w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm">شماره موبایل</label>
                <input name="phone" required defaultValue={editingUser.phone} className="dir-ltr w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {editingUser.role === "STUDENT" && (
                <div>
                  <label className="mb-1 block text-sm">مشاور مربوطه</label>
                  <select name="counselorId" defaultValue={editingUser.studentProfile?.counselorId || ""} className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">بدون مشاور</option>
                    {counselors.map((counselor) => (
                      <option key={counselor.id} value={counselor.id}>{counselor.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingUser.role === "PARENT" && (
                <div>
                  <label className="mb-1 block text-sm">دانش‌آموز مربوطه</label>
                  <select name="studentId" defaultValue={editingUser.parentProfile?.studentId || ""} className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">بدون دانش‌آموز</option>
                    {students.map((student) => (
                      <option key={student.studentProfile?.id} value={student.studentProfile?.id || ""}>{student.fullName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-primary py-2 font-medium text-primary-foreground disabled:opacity-50">
                  ذخیره تغییرات
                </button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 rounded-lg bg-muted py-2 font-medium">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}