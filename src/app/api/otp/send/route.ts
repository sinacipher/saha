import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendSmsOtp } from "@/lib/sms-provider"

const OTP_SECRET = process.env.AUTH_SECRET || "fallback-secret"

export async function POST(req: Request) {
  try {
    const { nationalId } = await req.json()
    
    // 1. Generic response to prevent account enumeration
    const genericResponse = NextResponse.json({ success: true, message: "اگر حساب شما وجود داشته باشد، کد برای شما ارسال می‌شود." })

    if (!nationalId) return genericResponse

    // Get IP for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown"

    // 2. Rate Limiting by IP (Max 10 requests per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const ipRequestCount = await prisma.otp.count({
      where: { ipAddress, createdAt: { gte: oneHourAgo } }
    })
    if (ipRequestCount >= 10) {
      return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است." }, { status: 429 })
    }

    const user = await prisma.user.findUnique({ where: { nationalId } })
    if (!user || !user.isActive) {
      // Return generic response to hide the fact the user doesn't exist or is inactive
      return genericResponse 
    }

    // 3. Rate Limiting by Account (Max 3 requests per 5 minutes)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentAccountOtps = await prisma.otp.count({
      where: { phone: user.phone, createdAt: { gte: fiveMinsAgo } }
    })
    if (recentAccountOtps >= 3) {
      return NextResponse.json({ error: "لطفاً ۵ دقیقه صبر کنید." }, { status: 429 })
    }

    // 4. Generate and Hash OTP
    const code = Math.floor(10000 + Math.random() * 90000).toString()
    const hashedCode = crypto.createHmac("sha256", OTP_SECRET).update(code).digest("hex")
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes

    // 5. Invalidate previous OTPs and save new one
    await prisma.$transaction([
      prisma.otp.deleteMany({ where: { phone: user.phone } }),
      prisma.otp.create({
        data: { phone: user.phone, hashedCode, expiresAt, ipAddress }
      })
    ])

    // 6. Send SMS
    try {
      await sendSmsOtp(user.phone, code)
    } catch (error) {
      console.error("SMS Delivery failed:", error)
      return NextResponse.json({ error: "خطا در ارسال پیامک. لطفاً بعداً تلاش کنید." }, { status: 500 })
    }

    return genericResponse

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 })
  }
}