import { afterEach, describe, expect, it, vi } from "vitest"
import { sendSmsOtp } from "@/lib/sms-provider"

describe("SMS provider safety", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("prints the OTP only in local development and masks the phone", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)

    await sendSmsOtp("+989121234567", "12345")

    expect(info).toHaveBeenCalledWith("[DEV OTP] Phone ending 4567: 12345")
    expect(info.mock.calls[0]?.[0]).not.toContain("989121234567")
  })

  it("fails closed outside development instead of pretending an SMS was sent", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined)

    await expect(sendSmsOtp("+989121234567", "12345")).rejects.toThrow(
      "ارسال پیامک در محیط عملیاتی پیکربندی نشده است",
    )
    expect(info).not.toHaveBeenCalled()
    expect(log).not.toHaveBeenCalled()
  })
})
