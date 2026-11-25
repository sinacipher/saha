import { randomInt } from "node:crypto"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { nationalId } = await req.json() as { nationalId?: string }

    if (!nationalId || !/^\d{10}$/.test(nationalId)) {
      return NextResponse.json({ error: "کد ملی معتبر نیست" }, { status: 400 })
    }

    // پیدا کردن کاربر
    const user = await prisma.user.findUnique({ where: { nationalId } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "کاربری با این کد ملی یافت نشد" }, { status: 404 })
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const recentOtps = await prisma.otp.count({
      where: {
        phone: user.phone,
        createdAt: { gte: oneHourAgo }
      }
    })

    if (recentOtps >= 5) {
      return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید." }, { status: 429 })
    }

    const latestOtp = await prisma.otp.findFirst({
      where: { phone: user.phone },
      orderBy: { createdAt: "desc" }
    })

    if (latestOtp && latestOtp.createdAt.getTime() > now.getTime() - 30 * 1000) {
      const waitSeconds = Math.ceil((latestOtp.createdAt.getTime() + 30 * 1000 - now.getTime()) / 1000)
      return NextResponse.json(
        { error: `لطفاً ${waitSeconds} ثانیه دیگر دوباره تلاش کنید.` },
        { status: 429 }
      )
    }

    // تولید کد ۵ رقمی با منبع تصادمی امن
    const code = randomInt(10000, 100000).toString()
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // ۲ دقیقه اعتبار

    // ذخیره در دیتابیس
    await prisma.otp.create({
      data: {
        phone: user.phone,
        code,
        expiresAt
      }
    })

    if (process.env.NODE_ENV === "development") {
      console.log(`کد توسعه‌ای ورود: ${code}`)
    }

    return NextResponse.json({ success: true, message: "کد تایید ارسال شد" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 })
  }
}