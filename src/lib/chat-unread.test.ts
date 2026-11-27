import { describe, expect, it } from "vitest"
import { countUnreadMessagesForParticipants } from "@/lib/chat-unread"

describe("countUnreadMessagesForParticipants", () => {
  it("sums unread messages from the student and linked parents", () => {
    const unread = new Map([
      ["student-user", 3],
      ["parent-one", 2],
      ["parent-two", 4],
    ])

    expect(
      countUnreadMessagesForParticipants(
        ["student-user", "parent-one", "parent-two"],
        unread,
      ),
    ).toBe(9)
  })

  it("does not count the same user twice", () => {
    const unread = new Map([["student-user", 3]])
    expect(
      countUnreadMessagesForParticipants(
        ["student-user", "student-user"],
        unread,
      ),
    ).toBe(3)
  })

  it("ignores unknown, zero, negative and non-finite counters", () => {
    const unread = new Map<string, number>([
      ["zero", 0],
      ["negative", -2],
      ["invalid", Number.NaN],
    ])
    expect(
      countUnreadMessagesForParticipants(
        ["missing", "zero", "negative", "invalid"],
        unread,
      ),
    ).toBe(0)
  })
})
