export async function sendSmsOtp(phone: string, code: string) {
  const apiKey = process.env.SMS_API_KEY

  // Always log the OTP so you can see it in Vercel Logs
  console.log(`\n=========================================`)
  console.log(`🔑 OTP for ${phone} : ${code}`)
  console.log(`=========================================\n`)

  if (!apiKey) {
    // No SMS provider configured — OTP is only in the logs.
    // Login will still work.
    return
  }

  // TODO: Real SMS provider integration here later
}