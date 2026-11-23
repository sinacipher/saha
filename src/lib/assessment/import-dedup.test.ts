import { describe, expect, it } from "vitest"
import { duplicateSimilarity, isPotentialDuplicate, normalizeForSimilarity } from "./import-dedup"

describe("assessment import duplicate detection", () => {
  it("normalizes Persian, Arabic, whitespace and punctuation", () => {
    expect(normalizeForSimilarity("  يافتن؟  كلمه،  ")).toBe("یافتنکلمه")
  })

  it("detects exact normalized duplicates", () => {
    expect(isPotentialDuplicate("ژنتیک DNA چیست؟", "ژنتیک DNA چیست")).toBe(true)
  })

  it("detects minor wording changes", () => {
    expect(isPotentialDuplicate("درختان اکسیژن تولید می‌کنند", "درختها اکسیژن تولید میکنند")).toBe(true)
  })

  it("does not mark unrelated questions as duplicates", () => {
    expect(isPotentialDuplicate("فشار اتمسفر چقدر است؟", "رشد گیاهان به نور وابسته است؟")).toBe(false)
  })

  it("returns a bounded similarity score", () => {
    const score = duplicateSimilarity("ABC", "ABD")
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})
