import { normalizeDigitsAndChars } from "./import-parser"

export function normalizeForSimilarity(value: string): string {
  return normalizeDigitsAndChars(value)
    .replace(/[؟?!.،,:؛؛()[\]{}"']/g, "")
    .replace(/[\s]+/g, "")
    .trim()
}

export function levenshteinDistance(first: string, second: string): number {
  const left = normalizeForSimilarity(first)
  const right = normalizeForSimilarity(second)
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      )
    }
    for (let rightIndex = 0; rightIndex <= right.length; rightIndex++) {
      previous[rightIndex] = current[rightIndex]
    }
  }

  return previous[right.length]
}

export function duplicateSimilarity(first: string, second: string): number {
  const left = normalizeForSimilarity(first)
  const right = normalizeForSimilarity(second)
  if (!left || !right) return 0
  if (left === right) return 1

  const longest = Math.max(left.length, right.length)
  const distance = levenshteinDistance(left, right)
  return longest === 0 ? 0 : 1 - distance / longest
}

export function isPotentialDuplicate(first: string, second: string, threshold = 0.82): boolean {
  return duplicateSimilarity(first, second) >= threshold
}
