import { describe, expect, it } from "vitest"
import { isAssignedChatReceiver, normalizeChatText } from "./chat-policy"

describe("chat policy", () => {
  it("allows only an assigned student counselor", () => {
    expect(isAssignedChatReceiver({
      role: "STUDENT",
      counselorId: "counselor-1",
      studentCounselorId: "counselor-1"
    })).toBe(true)

    expect(isAssignedChatReceiver({
      role: "STUDENT",
      counselorId: "counselor-1",
      studentCounselorId: "counselor-2"
    })).toBe(false)
  })

  it("allows only a parent assigned through the student's counselor", () => {
    expect(isAssignedChatReceiver({
      role: "PARENT",
      counselorId: "counselor-1",
      parentStudentCounselorId: "counselor-1"
    })).toBe(true)

    expect(isAssignedChatReceiver({
      role: "PARENT",
      counselorId: "counselor-1",
      parentStudentCounselorId: null
    })).toBe(false)
  })

  it("trims messages and rejects empty content", () => {
    expect(normalizeChatText("  سلام  ")).toBe("سلام")
    expect(normalizeChatText("   ")).toBe("")
    expect(normalizeChatText(undefined)).toBe("")
  })
})
