import { describe, it, expect } from "vitest"
import crypto from "crypto"

const mockHash = (code: string) => crypto.createHmac("sha256", "test-secret").update(code).digest("hex")

describe("OTP Security", () => {
  it("should hash codes deterministically", () => {
    const hash1 = mockHash("12345")
    const hash2 = mockHash("12345")
    const hash3 = mockHash("54321")
    
    expect(hash1).toBe(hash2)
    expect(hash1).not.toBe(hash3)
  })

  it("should not match a plaintext code against a hash", () => {
    const hash = mockHash("12345")
    expect(hash).not.toBe("12345")
  })
})