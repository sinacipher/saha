export type ImportField =
  | "externalId"
  | "subject"
  | "chapter"
  | "topic"
  | "difficulty"
  | "text"
  | "optionA"
  | "optionB"
  | "optionC"
  | "optionD"
  | "correctAnswer"
  | "explanation"
  | "tags"
  | "source"
  | "passageId"

export type ImportMapping = Partial<Record<ImportField, string>>

const aliases: Record<ImportField, string[]> = {
  externalId: ["question id", "questionid", "شناسه سؤال", "شناسه سوال", "شناسه"],
  subject: ["subject", "درس", "ماده درسی", "رشته"],
  chapter: ["chapter", "فصل", "بخش"],
  topic: ["topic", "موضوع", "مبحث"],
  difficulty: ["difficulty", "سطح دشواری", "سطح", "دشواری"],
  text: ["question", "سؤال", "متن سؤال", "متن سوال", "صورت سوال", "صورت مسئله"],
  optionA: ["option a", "optiona", "a", "الف", "گزینه الف", "گزینه آ"],
  optionB: ["option b", "optionb", "b", "ب", "گزینه ب"],
  optionC: ["option c", "optionc", "c", "ج", "گزینه ج"],
  optionD: ["option d", "optiond", "d", "د", "گزینه د"],
  correctAnswer: ["correct answer", "answer", "پاسخ صحیح", "پاسخ", "گزینه صحیح"],
  explanation: ["explanation", "توضیح", "پاسخنامه", "شرح پاسخ"],
  tags: ["tags", "برچسب", "برچسبها", "برچسب ها"],
  source: ["source", "منبع", "مرجع"],
  passageId: ["passage id", "passageid", "شناسه متن", "متن مشترک"]
}

export function normalizeImportHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[_\s-]/g, "")
}

export function suggestImportMapping(headers: string[]): ImportMapping {
  const mapping: ImportMapping = {}

  for (const [field, fieldAliases] of Object.entries(aliases) as Array<[ImportField, string[]]>) {
    const match = headers.find((header) => {
      const normalizedHeader = normalizeImportHeader(header)
      return fieldAliases.some((alias) => normalizeImportHeader(alias) === normalizedHeader)
    })
    if (match) mapping[field] = match
  }

  return mapping
}

export function applyImportMapping(row: Record<string, unknown>, mapping: ImportMapping): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const [field, header] of Object.entries(mapping) as Array<[ImportField, string]>) {
    if (header) mapped[field] = row[header]
  }
  return mapped
}
