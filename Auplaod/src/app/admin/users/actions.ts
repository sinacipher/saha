"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }
}

export async function createUserAction(formData: FormData) {
  await requireAdmin()
  const role = formData.get("role") as "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"
  const nationalId = formData.get("nationalId") as string
  const phone = formData.get("phone") as string
  const fullName = formData.get("fullName") as string

  if (!role || !nationalId || !phone || !fullName) {
    return { error: "لطفاً تمام فیلدها را پر کنید." }
  }

  if (!["ADMIN", "COUNSELOR", "STUDENT", "PARENT"].includes(role)) {
    return { error: "نقش انتخاب‌شده معتبر نیست." }
  }

  try {
    // بررسی تکراری نبودن
    const existing = await prisma.user.findFirst({
      where: { OR: [{ nationalId }, { phone }] }
    })

    if (existing) {
      return { error: "کاربری با این کد ملی یا شماره موبایل قبلاً ثبت شده است." }
    }

    if (role === "STUDENT") {
      const counselorId = formData.get("counselorId") as string
      await prisma.user.create({
        data: {
          role, nationalId, phone, fullName,
          studentProfile: {
            create: { counselorId: counselorId || null }
          }
        }
      })
    } 
    else if (role === "PARENT") {
      const studentId = formData.get("studentId") as string
      await prisma.user.create({
        data: {
          role, nationalId, phone, fullName,
          parentProfile: {
            create: { studentId: studentId || null }
          }
        }
      })
    } 
    else {
      // ADMIN یا COUNSELOR
      await prisma.user.create({
        data: { role, nationalId, phone, fullName }
      })
    }

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "خطایی در سرور رخ داد." }
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  await requireAdmin()

  const fullName = String(formData.get("fullName") || "").trim()
  const nationalId = String(formData.get("nationalId") || "").trim()
  const phone = String(formData.get("phone") || "").trim()
  const counselorId = String(formData.get("counselorId") || "")
  const studentId = String(formData.get("studentId") || "")

  if (!fullName || !nationalId || !phone) {
    return { error: "لطفاً تمام فیلدها را پر کنید." }
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ nationalId }, { phone }]
      }
    })

    if (existing) {
      return { error: "کد ملی یا شماره موبایل قبلاً برای کاربر دیگری ثبت شده است." }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true, parentProfile: true }
    })

    if (!user) return { error: "کاربر یافت نشد." }

    await prisma.user.update({
      where: { id: userId },
      data: { fullName, nationalId, phone }
    })

    if (user.role === "STUDENT") {
      await prisma.studentProfile.upsert({
        where: { userId },
        create: { userId, counselorId: counselorId || null },
        update: { counselorId: counselorId || null }
      })
    }

    if (user.role === "PARENT") {
      await prisma.parentProfile.upsert({
        where: { userId },
        create: { userId, studentId: studentId || null },
        update: { studentId: studentId || null }
      })
    }

    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "خطایی در سرور رخ داد." }
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean) {
  await requireAdmin()

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    })
    revalidatePath("/admin/users")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "خطایی در سرور رخ داد." }
  }
}