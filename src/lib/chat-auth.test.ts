/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { isAuthorizedToChat } from "./chat-auth"
import { prisma } from "@/lib/prisma"

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    studentProfile: { findUnique: vi.fn(), findFirst: vi.fn() },
    parentProfile: { findUnique: vi.fn(), findFirst: vi.fn() }
  }
}))

describe("Chat Authorization Security", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Admin should always be authorized", async () => {
    const res = await isAuthorizedToChat("admin-id", "ADMIN", "any-id")
    expect(res).toBe(true)
  })

  it("Student should be authorized only with their assigned counselor", async () => {
    vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue({ counselorId: "counselor-1" } as any)
    
    expect(await isAuthorizedToChat("student-1", "STUDENT", "counselor-1")).toBe(true)
    expect(await isAuthorizedToChat("student-1", "STUDENT", "counselor-2")).toBe(false)
  })

  it("Parent should be authorized only with their child's counselor", async () => {
    vi.mocked(prisma.parentProfile.findUnique).mockResolvedValue({ 
      student: { counselorId: "counselor-1" } 
    } as any)
    
    expect(await isAuthorizedToChat("parent-1", "PARENT", "counselor-1")).toBe(true)
    expect(await isAuthorizedToChat("parent-1", "PARENT", "counselor-2")).toBe(false)
  })

  it("Counselor should be authorized with assigned student", async () => {
    vi.mocked(prisma.studentProfile.findFirst).mockResolvedValue({ id: "sp-1" } as any)
    
    expect(await isAuthorizedToChat("counselor-1", "COUNSELOR", "student-1")).toBe(true)
  })

  it("Counselor should NOT be authorized with unassigned student", async () => {
    vi.mocked(prisma.studentProfile.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.parentProfile.findFirst).mockResolvedValue(null)
    
    expect(await isAuthorizedToChat("counselor-1", "COUNSELOR", "student-2")).toBe(false)
  })
})