import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import { sendSmsOtp } from "@/lib/sms-provider"
import {
  normalizeNationalId,
  isValidNationalIdFormat,
  nationalIdVariants,
} from "@/lib/national-id"

const OTP_SECRET = process.env.AUTH_SECRET

export async function POST(req: Request) {
  try {
    if (!OTP_SECRET) {
      console.error("AUTH_SECRET is missing")
      return NextResponse.json(
        { error: "تنظیمات امنیتی سرور کامل نیست." },
        { status: 500 }
      )
    }

    const body = await req.json()
    const nationalId = normalizeNationalId(String(body.nationalId || ""))

    if (!isValidNationalIdFormat(nationalId)) {
      return NextResponse.json(
        { error: "کد ملی باید دقیقاً ۱۰ رقم باشد." },
        { status: 400 }
      )
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown"

    // IP rate limit: 10 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const ipRequestCount = await prisma.otp.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (ipRequestCount >= 10) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها بیش از حد مجاز است. بعداً تلاش کنید." },
        { status: 429 }
      )
    }

    // Match English, Persian and Arabic digits in existing records.
    const user = await prisma.user.findFirst({
      where: {
        nationalId: {
          in: nationalIdVariants(nationalId),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "این کد ملی در سامانه ثبت نشده است." },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "حساب کاربری شما غیرفعال است. با مدیر سامانه تماس بگیرید." },
        { status: 403 }
      )
    }

    // Account rate limit: 3 requests per 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const accountRequestCount = await prisma.otp.count({
      where: {
        phone: user.phone,
        createdAt: { gte: fiveMinutesAgo },
      },
    })

    if (accountRequestCount >= 3) {
      return NextResponse.json(
        { error: "تعداد درخواست‌ها زیاد است. پنج دقیقه صبر کنید." },
        { status: 429 }
      )
    }

    // Generate a secure five-digit OTP.
    const code = crypto.randomInt(10000, 100000).toString()

    const hashedCode = crypto
      .createHmac("sha256", OTP_SECRET)
      .update(code)
      .digest("hex")

    const expiresAt = new Date(Date.now() + 2 * 60 * 1000)

    // Remove old codes and save the new one.
    await prisma.$transaction([
      prisma.otp.deleteMany({
        where: { phone: user.phone },
      }),

      prisma.otp.create({
        data: {
          phone: user.phone,
          hashedCode,
          expiresAt,
          ipAddress,
        },
      }),
    ])

    try {
      await sendSmsOtp(user.phone, code)
    } catch (error) {
      console.error("OTP delivery failed:", error)

      await prisma.otp.deleteMany({
        where: { phone: user.phone },
      })

      return NextResponse.json(
        { error: "ارسال پیامک ناموفق بود. بعداً تلاش کنید." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "کد ورود با موفقیت ارسال شد.",
    })
  } catch (error) {
    console.error("OTP send error:", error)

    return NextResponse.json(
      { error: "خطای داخلی سرور هنگام ارسال کد ورود." },
      { status: 500 }
    )
  }
}