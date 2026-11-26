/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/chat/route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { isAuthorizedToChat } from "@/lib/chat-auth"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    message: { count: vi.fn() },
    chat: { findFirst: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))
vi.mock("@/lib/chat-auth", () => ({
  isAuthorizedToChat: vi.fn(),
}))

function makeRequest(body: object) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("Chat POST rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "STUDENT" } } as any)
    vi.mocked(isAuthorizedToChat).mockResolvedValue(true)
  })

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await POST(makeRequest({ receiverId: "c1", content: "hi" }))
    expect(res.status).toBe(401)
  })

  it("rejects when under limit but chat insert fails with 500", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        message: { count: vi.fn().mockResolvedValue(5), create: vi.fn() },
        chat: { findFirst: vi.fn().mockResolvedValue({ id: "chat-1" }), create: vi.fn() },
        user: { findUnique: vi.fn() },
      }
      return fn(tx)
    })
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error("DB_DOWN"))
    const res = await POST(makeRequest({ receiverId: "c1", content: "hi" }))
    expect(res.status).toBe(500)
  })

  it("allows message when count is below 20", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        message: { count: vi.fn().mockResolvedValue(19), create: vi.fn().mockResolvedValue({}) },
        chat: { findFirst: vi.fn().mockResolvedValue({ id: "chat-1" }), create: vi.fn() },
        user: { findUnique: vi.fn() },
      }
      return fn(tx)
    })
    const res = await POST(makeRequest({ receiverId: "c1", content: "hi" }))
    expect(res.status).toBe(200)
  })

  it("rejects the 21st message with 429 + Retry-After", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        message: { count: vi.fn().mockResolvedValue(20), create: vi.fn() },
        chat: { findFirst: vi.fn(), create: vi.fn() },
        user: { findUnique: vi.fn() },
      }
      return fn(tx)
    })
    const res = await POST(makeRequest({ receiverId: "c1", content: "hi" }))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("60")
    const data = await res.json()
    expect(data.error).toContain("بیش از حد مجاز")
  })

  it("does not count unauthorized requests (403 short-circuits before count)", async () => {
    vi.mocked(isAuthorizedToChat).mockResolvedValue(false)
    const res = await POST(makeRequest({ receiverId: "c1", content: "hi" }))
    expect(res.status).toBe(403)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("does not count malformed requests (400 short-circuits)", async () => {
    const res = await POST(makeRequest({ receiverId: "c1", content: "   " }))
    expect(res.status).toBe(400)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns 429 on Prisma P2034 (serialization conflict)", async () => {
    const err = Object.assign(new Error("conflict"), { code: "P2034" })
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(err)
    const res = await POST(makeRequest({ receiverId: "c1", content: "hi" }))
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("5")
  })
})