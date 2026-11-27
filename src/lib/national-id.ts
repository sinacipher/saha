export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/[٠-٩]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    )
}

export function normalizeNationalId(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "")
}

export function isValidNationalIdFormat(value: string): boolean {
  return /^\d{10}$/.test(value)
}

export function nationalIdVariants(value: string): string[] {
  const normalized = normalizeNationalId(value)
  if (!isValidNationalIdFormat(normalized)) return []

  const persian = Array.from(normalized, (digit) =>
    String.fromCharCode(0x06f0 + Number(digit))
  ).join("")
  const arabic = Array.from(normalized, (digit) =>
    String.fromCharCode(0x0660 + Number(digit))
  ).join("")

  return [...new Set([normalized, persian, arabic])]
}
