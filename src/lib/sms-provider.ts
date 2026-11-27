/**
 * Development-only OTP output.
 * Production must fail closed until a real SMS provider adapter is configured.
 */
export async function sendSmsOtp(phone: string, code: string): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    const digits = phone.replace(/\D/g, "")
    const suffix = digits.slice(-4).padStart(4, "*")
    console.info(`[DEV OTP] Phone ending ${suffix}: ${code}`)
    return
  }

  throw new Error(
    "ارسال پیامک در محیط عملیاتی پیکربندی نشده است. اتصال سرویس پیامک الزامی است.",
  )
}
