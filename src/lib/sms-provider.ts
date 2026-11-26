export async function sendSmsOtp(phone: string, code: string) {
  const apiKey = process.env.SMS_API_KEY

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMS Provider API Key is missing in production.")
    }
    // Development fallback
    console.log(`\n=========================================`)
    console.log(`🔑 کد ورود برای ${phone} : ${code}`)
    console.log(`=========================================\n`)
    return
  }

  // TODO: Implement actual provider (e.g., Kavenegar, SMS.ir) here.
  // Example:
  // await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json?receptor=${phone}&message=${code}`)
}