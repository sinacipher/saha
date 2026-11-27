import { describe, expect, it } from "vitest"
import {
  normalizeDigits,
  normalizeNationalId,
  isValidNationalIdFormat,
  nationalIdVariants,
} from "@/lib/national-id"

describe("National ID normalization", () => {
  it("normalizes Persian and Arabic numerals to ASCII", () => {
    expect(normalizeDigits("۱۲۳۴۵٦٧٨٩٠")).toBe("1234567890")
    expect(normalizeDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789")
  })

  it("removes separators after digit normalization", () => {
    expect(normalizeNationalId("۱۲۳-۴۵۶ ۷۸۹۰")).toBe("1234567890")
  })

  it("requires exactly ten digits", () => {
    expect(isValidNationalIdFormat("0123456789")).toBe(true)
    expect(isValidNationalIdFormat("123456789")).toBe(false)
    expect(isValidNationalIdFormat("12345678901")).toBe(false)
  })

  it("creates equivalent English, Persian and Arabic variants", () => {
    expect(nationalIdVariants("0123456789")).toEqual([
      "0123456789",
      "۰۱۲۳۴۵۶۷۸۹",
      "٠١٢٣٤٥٦٧٨٩",
    ])
  })
})
