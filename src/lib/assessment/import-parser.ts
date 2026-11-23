import ExcelJS from "exceljs"
import mammoth from "mammoth"
import type { ImportMapping } from "./import-mapping"

export type UnifiedImportQuestion = {
  externalId: string | null
  passageId: string | null
  subject: string | null
  chapter: string | null
  topic: string | null
  difficulty: "EASY" | "MEDIUM" | "HARD"
  text: string
  options: Array<{ optionKey: "A" | "B" | "C" | "D"; text: string }>
  correctAnswer: "A" | "B" | "C" | "D" | null
  explanation: string | null
  tags: string[]
  source: string | null
}

export function normalizeDigitsAndChars(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/‌/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeAnswer(value: string): "A" | "B" | "C" | "D" | null {
  const normalized = normalizeDigitsAndChars(value).trim().toUpperCase()
  const map: Record<string, "A" | "B" | "C" | "D"> = {
    A: "A", B: "B", C: "C", D: "D",
    الف: "A", ب: "B", ج: "C", د: "D",
    "1": "A", "2": "B", "3": "C", "4": "D"
  }
  return map[normalized] || null
}

export function normalizeDifficulty(value: string): "EASY" | "MEDIUM" | "HARD" {
  const normalized = normalizeDigitsAndChars(value).toUpperCase()
  if (["EASY", "آسان", "ساده"].includes(normalized)) return "EASY"
  if (["HARD", "سخت", "دشوار"].includes(normalized)) return "HARD"
  return "MEDIUM"
}

function normalizeHeader(value: unknown): string {
  return normalizeDigitsAndChars(String(value || ""))
    .toLowerCase()
    .replace(/[_\s-]/g, "")
}

function findHeader(row: Record<string, unknown>, aliases: string[]): unknown {
  const normalizedAliases = aliases.map(normalizeHeader)
  const entry = Object.entries(row).find(([key]) => normalizedAliases.includes(normalizeHeader(key)))
  return entry?.[1]
}

export async function getXlsxHeaders(buffer: Buffer): Promise<string[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const sheet = workbook.getWorksheet("Questions") || workbook.worksheets[0]
  if (!sheet) return []
  return (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value || "").trim()).filter(Boolean)
}

export async function parseXlsx(buffer: Buffer, mapping?: ImportMapping): Promise<UnifiedImportQuestion[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0])

  const sheet = workbook.getWorksheet("Questions") || workbook.worksheets[0]
  if (!sheet) return []

  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value || ""))
  const questions: UnifiedImportQuestion[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const record: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      record[header] = row.getCell(index + 1).value
    })

    const getMapped = (field: keyof ImportMapping, aliases: string[]) => {
      const mappedHeader = mapping?.[field]
      if (mappedHeader) return record[mappedHeader]
      return aliases.map((alias) => findHeader(record, [alias])).find((item) => item != null)
    }

    const optionKeys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"]
    const options = optionKeys.map((key, index) => {
      const labels = [
        [`Option ${key}`, `گزینه ${["الف", "ب", "ج", "د"][index]}`, key,
          ["الف", "ب", "ج", "د"][index]]
      ]
      const field = (["optionA", "optionB", "optionC", "optionD"] as const)[index]
      const value = getMapped(field, labels.flat())
      return { optionKey: key, text: String(value || "").trim() }
    })

    questions.push({
      externalId: String(getMapped("externalId", ["Question ID", "شناسه سؤال", "شناسه"] ) || "").trim() || null,
      passageId: String(getMapped("passageId", ["Passage ID", "شناسه متن", "متن مشترک"] ) || "").trim() || null,
      subject: String(getMapped("subject", ["Subject", "درس"] ) || "").trim() || null,
      chapter: String(getMapped("chapter", ["Chapter", "فصل"] ) || "").trim() || null,
      topic: String(getMapped("topic", ["Topic", "موضوع"] ) || "").trim() || null,
      difficulty: normalizeDifficulty(String(getMapped("difficulty", ["Difficulty", "سطح دشواری"] ) || "Medium")),
      text: String(getMapped("text", ["Question", "سؤال", "متن سؤال"] ) || "").trim(),
      options,
      correctAnswer: normalizeAnswer(String(getMapped("correctAnswer", ["Correct Answer", "پاسخ صحیح"] ) || "")),
      explanation: String(getMapped("explanation", ["Explanation", "توضیح"] ) || "").trim() || null,
      tags: String(getMapped("tags", ["Tags", "برچسب‌ها"] ) || "")
        .split(/[,،]/).map((tag) => tag.trim()).filter(Boolean),
      source: String(getMapped("source", ["Source", "منبع"] ) || "").trim() || null
    })
  })

  return questions
}

export async function parseDocx(buffer: Buffer): Promise<UnifiedImportQuestion[]> {
  const result = await mammoth.extractRawText({ buffer })
  const lines = result.value.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean)
  const questions: UnifiedImportQuestion[] = []
  let current: UnifiedImportQuestion | null = null

  const flush = () => {
    if (current) questions.push(current)
  }

  for (const line of lines) {
    const start = /^Question\s*([\d۰-۹٠-٩]+)?\s*[:.)-]?\s*(.*)$/i.exec(line)
    const numbered = /^([\d۰-۹٠-٩]+)[.)-]\s*(.*)$/.exec(line)

    if (start || (numbered && /^\d{1,4}$/.test(normalizeDigitsAndChars(numbered[1]))) ) {
      flush()
      const id = start?.[1] || numbered?.[1]
      current = {
        externalId: id ? `Q-${normalizeDigitsAndChars(id)}` : null,
        passageId: null,
        subject: null,
        chapter: null,
        topic: null,
        difficulty: "MEDIUM",
        text: "",
        options: [],
        correctAnswer: null,
        explanation: null,
        tags: [],
        source: null
      }
      const inlineText = start?.[2] || numbered?.[2]
      if (inlineText && !/^subject:|^chapter:|^difficulty:/i.test(inlineText)) {
        current.text = inlineText
      }
      continue
    }

    if (!current) continue

    const field = /^([^:]+):\s*(.*)$/.exec(line)
    if (field) {
      const key = normalizeHeader(field[1])
      const value = field[2].trim()
      if (["subject", "درس"].includes(key)) current.subject = value
      else if (["chapter", "فصل"].includes(key)) current.chapter = value
      else if (["topic", "موضوع"].includes(key)) current.topic = value
      else if (["difficulty", "سطحدشواری"].includes(key)) current.difficulty = normalizeDifficulty(value)
      else if (["correctanswer", "پاسخصحیح"].includes(key)) current.correctAnswer = normalizeAnswer(value)
      else if (["explanation", "توضیح"].includes(key)) current.explanation = value
      else if (["tags", "برچسبها"].includes(key)) current.tags = value.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean)
      else if (["source", "منبع"].includes(key)) current.source = value
      else if (["passageid", "شناسهمتن"].includes(key)) current.passageId = value
      else if (["question", "سؤال", "متنسؤال"].includes(key)) current.text = value
      continue
    }

    const option = /^([A-Dالفبجد])[).]\s*(.*)$/i.exec(line)
    if (option) {
      const answer = normalizeAnswer(option[1])
      if (answer) current.options.push({ optionKey: answer, text: option[2].trim() })
      continue
    }

    if (!current.text && line) current.text = line
  }

  flush()
  return questions
}
