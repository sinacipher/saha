/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { GET, POST } from "@/app/api/chat/route"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// Mock Auth
vi.mock("@/auth", () => ({ auth: vi.fn() }))
// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chat: { findFirst: vi.fn(), create: vi.fn() },
    message: { create: vi.fn() },
    user: { findUnique: vi.fn() }
  }
}))
// Mock Authorization Helper
vi.mock("@/lib/chat-auth", () => ({
  isAuthorizedToChat: vi.fn()
}))

describe("Chat API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET: Reject unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const req = new Request("http://localhost/api/chat?receiverId=user-2")
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("POST: Reject empty messages", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "STUDENT" } } as any)
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ receiverId: "u2", content: "   " })
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain("ناقص")
  })

  it("POST: Reject unauthorized conversations", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "STUDENT" } } as any)
    // Force authorization to fail
    const { isAuthorizedToChat } = await import("@/lib/chat-auth")
    vi.mocked(isAuthorizedToChat).mockResolvedValue(false)

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ receiverId: "u3", content: "سلام" })
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it("POST: Successfully sends and saves a message", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "STUDENT" } } as any)
    const { isAuthorizedToChat } = await import("@/lib/chat-auth")
    vi.mocked(isAuthorizedToChat).mockResolvedValue(true)
    
    // Mock chat exists
    vi.mocked(prisma.chat.findFirst).mockResolvedValue({ id: "chat-123" } as any)
    vi.mocked(prisma.message.create).mockResolvedValue({} as any)

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ receiverId: "counselor-1", content: "سلام استاد" })
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: { chatId: "chat-123", senderId: "u1", content: "سلام استاد" }
    })
  })
})