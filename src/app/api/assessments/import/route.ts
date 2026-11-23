import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseDocx, parseXlsx, getXlsxHeaders, normalizeAnswer, normalizeDifficulty } from "@/lib/assessment/import-parser"
import { suggestImportMapping, type ImportMapping } from "@/lib/assessment/import-mapping"
import { duplicateSimilarity, isPotentialDuplicate, normalizeForSimilarity } from "@/lib/assessment/import-dedup"
import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store")
  return response
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return noStore(NextResponse.json({ error: "فایل انتخاب نشده است" }, { status: 400 }))
  }

  if (file.size > 25 * 1024 * 1024) {
    return noStore(NextResponse.json({ error: "حجم فایل نباید از ۲۵ مگابایت بیشتر باشد" }, { status: 413 }))
  }

  const lowerName = file.name.toLowerCase()
  const format = lowerName.endsWith(".xlsx") ? "xlsx" : lowerName.endsWith(".docx") ? "docx" : null
  if (!format) {
    return noStore(NextResponse.json({ error: "فقط فایل‌های xlsx و docx پذیرفته می‌شوند" }, { status: 415 }))
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fingerprint = createHash("sha256").update(buffer).digest("hex")

  const existingBatch = await prisma.importBatch.findFirst({
    where: { fingerprint, importingUserId: session.user.id },
    include: { items: { orderBy: { rowNumber: "asc" } } }
  })

  if (existingBatch) {
    const report = existingBatch.reportJson as { validCount?: number; warningCount?: number; failedCount?: number } | null
    return noStore(NextResponse.json({
      batchId: existingBatch.id,
      duplicateSubmission: true,
      totalFound: existingBatch.totalFound,
      validCount: report?.validCount || existingBatch.successfulCount,
      warningCount: report?.warningCount || existingBatch.warningCount,
      failedCount: report?.failedCount || existingBatch.failedCount,
      headers: [],
      suggestedMapping: {},
      items: existingBatch.items.map((item) => ({
        id: item.id,
        rowNumber: item.rowNumber,
        sourceText: item.sourceText,
        normalized: item.normalized,
        errors: item.errorsJson,
        warnings: item.warningsJson,
        duplicate: item.duplicate
      }))
    }))
  }

  let questions
  let headers: string[] = []
  let suggestedMapping: ImportMapping = {}
  try {
    if (format === "xlsx") {
      headers = await getXlsxHeaders(buffer)
      suggestedMapping = suggestImportMapping(headers)
      questions = await parseXlsx(buffer, suggestedMapping)
    } else {
      questions = await parseDocx(buffer)
    }
  } catch {
    return noStore(NextResponse.json({ error: "فایل خراب، رمزگذاری‌شده یا قابل خواندن نیست" }, { status: 422 }))
  }

  const batch = await prisma.importBatch.create({
    data: {
      importingUserId: session.user.id,
      originalName: file.name,
      format: format.toUpperCase(),
      fingerprint,
      status: "READY_FOR_REVIEW",
      totalFound: questions.length,
      reportJson: {}
    }
  })

  const existingTexts = await prisma.question.findMany({
    select: { externalId: true, text: true }
  })

  let validCount = 0
  let warningCount = 0
  let failedCount = 0

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index]
      const errors: string[] = []
      const warnings: string[] = []

      if (!question.text) errors.push("متن سؤال خالی است")
      if (!question.subject) errors.push("درس مشخص نشده است")
      if (question.options.length !== 4 || question.options.some((option) => !option.text.trim())) {
        errors.push("چهار گزینه کامل الزامی است")
      }
      if (!question.correctAnswer) errors.push("پاسخ صحیح معتبر نیست")

      const normalizedText = normalizeForSimilarity(question.text)
      const duplicateMatch = existingTexts.find((item) =>
        (!!question.externalId && item.externalId === question.externalId) ||
        normalizeForSimilarity(item.text) === normalizedText ||
        isPotentialDuplicate(item.text, question.text)
      )
      const duplicateScore = duplicateMatch
        ? duplicateMatch.externalId === question.externalId
          ? 1
          : duplicateSimilarity(duplicateMatch.text, question.text)
        : 0

      const duplicate = !!duplicateMatch

      if (duplicate) warnings.push(`سؤال ممکن است تکراری باشد؛ شباهت تقریبی ${Math.round(duplicateScore * 100)}٪`)
      if (!question.chapter) warnings.push("فصل مشخص نشده است")

      if (errors.length === 0) validCount++
      else failedCount++
      if (warnings.length) warningCount++

      await tx.importItem.create({
        data: {
          batchId: batch.id,
          rowNumber: index + 1,
          sourceText: question.text,
          normalized: question as unknown as object,
          errorsJson: errors,
          warningsJson: warnings,
          duplicate: !!duplicate,
          state: duplicate || errors.length ? "PENDING_REVIEW" : "VALID"
        }
      })
    }
  })

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      warningCount,
      failedCount,
      successfulCount: validCount,
      reportJson: {
        validCount,
        warningCount,
        failedCount,
        format
      }
    }
  })

  const items = await prisma.importItem.findMany({
    where: { batchId: batch.id },
    orderBy: { rowNumber: "asc" }
  })

  return noStore(NextResponse.json({
    batchId: batch.id,
    totalFound: questions.length,
    validCount,
    warningCount,
    failedCount,
    headers,
    suggestedMapping,
    items: items.map((item) => ({
      id: item.id,
      rowNumber: item.rowNumber,
      sourceText: item.sourceText,
      normalized: item.normalized,
      errors: item.errorsJson,
      warnings: item.warningsJson,
      duplicate: item.duplicate
    }))
  }))
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const body = await request.json() as {
    batchId?: string
    itemIds?: string[]
    mapping?: ImportMapping
    correction?: {
      itemId: string
      text?: string
      subject?: string
      chapter?: string
      topic?: string
      difficulty?: string
      optionA?: string
      optionB?: string
      optionC?: string
      optionD?: string
      correctAnswer?: string
      explanation?: string
      tags?: string[]
      source?: string
    }
  }
  if (!body.batchId) return noStore(NextResponse.json({ error: "شناسه batch الزامی است" }, { status: 400 }))

  const batch = await prisma.importBatch.findFirst({
    where: {
      id: body.batchId,
      importingUserId: session.user.id
    }
  })
  if (!batch) return noStore(NextResponse.json({ error: "Batch یافت نشد" }, { status: 404 }))

  if (body.correction) {
    const item = await prisma.importItem.findFirst({
      where: { id: body.correction.itemId, batchId: batch.id }
    })
    if (!item) return noStore(NextResponse.json({ error: "Item یافت نشد" }, { status: 404 }))

    const normalized = item.normalized as unknown as {
      externalId: string | null
      passageId: string | null
      subject: string
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

    const corrected = {
      ...normalized,
      text: body.correction.text?.trim() || normalized.text,
      subject: body.correction.subject?.trim() || normalized.subject,
      chapter: body.correction.chapter?.trim() || null,
      topic: body.correction.topic?.trim() || null,
      difficulty: normalizeDifficulty(body.correction.difficulty || normalized.difficulty),
      options: [
        { optionKey: "A" as const, text: body.correction.optionA?.trim() || normalized.options.find((option) => option.optionKey === "A")?.text || "" },
        { optionKey: "B" as const, text: body.correction.optionB?.trim() || normalized.options.find((option) => option.optionKey === "B")?.text || "" },
        { optionKey: "C" as const, text: body.correction.optionC?.trim() || normalized.options.find((option) => option.optionKey === "C")?.text || "" },
        { optionKey: "D" as const, text: body.correction.optionD?.trim() || normalized.options.find((option) => option.optionKey === "D")?.text || "" }
      ],
      correctAnswer: normalizeAnswer(body.correction.correctAnswer || normalized.correctAnswer || ""),
      explanation: body.correction.explanation?.trim() || null,
      tags: body.correction.tags || normalized.tags,
      source: body.correction.source?.trim() || null
    }

    const errors: string[] = []
    if (!corrected.text) errors.push("متن سؤال خالی است")
    if (!corrected.subject) errors.push("درس مشخص نشده است")
    if (corrected.options.some((option) => !option.text)) errors.push("چهار گزینه کامل الزامی است")
    if (!corrected.correctAnswer) errors.push("پاسخ صحیح معتبر نیست")

    await prisma.importItem.update({
      where: { id: item.id },
      data: {
        sourceText: corrected.text,
        normalized: corrected,
        errorsJson: errors
      }
    })

    return noStore(NextResponse.json({ success: true, itemId: item.id, errors }))
  }

  const items = await prisma.importItem.findMany({
    where: {
      batchId: batch.id,
      ...(body.itemIds?.length ? { id: { in: body.itemIds } } : {})
    },
    orderBy: { rowNumber: "asc" }
  })

  let successfulCount = 0
  let failedCount = 0

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const errors = item.errorsJson as string[]
      if (errors.length) {
        failedCount++
        continue
      }

      const normalized = item.normalized as unknown as {
        externalId: string | null
        subject: string
        chapter: string | null
        topic: string | null
        difficulty: "EASY" | "MEDIUM" | "HARD"
        text: string
        options: Array<{ optionKey: "A" | "B" | "C" | "D"; text: string }>
        correctAnswer: "A" | "B" | "C" | "D"
        explanation: string | null
        tags: string[]
        source: string | null
        passageId: string | null
      }

      const subject = await tx.assessmentSubject.upsert({
        where: { name: normalized.subject },
        update: {},
        create: { name: normalized.subject }
      })

      let chapterId: string | null = null
      if (normalized.chapter) {
        const chapter = await tx.assessmentChapter.upsert({
          where: { subjectId_name: { subjectId: subject.id, name: normalized.chapter } },
          update: {},
          create: { subjectId: subject.id, name: normalized.chapter }
        })
        chapterId = chapter.id
      }

      const question = await tx.question.create({
        data: {
          externalId: normalized.externalId,
          text: normalized.text,
          subjectId: subject.id,
          chapterId,
          topic: normalized.topic,
          difficulty: normalized.difficulty,
          explanation: normalized.explanation,
          tagsJson: normalized.tags,
          source: normalized.source,
          authorId: session.user.id,
          status: session.user.role === "ADMIN" ? "APPROVED" : "PENDING_REVIEW",
          options: {
            create: normalized.options.map((option, position) => ({
              optionKey: option.optionKey,
              text: option.text,
              isCorrect: option.optionKey === normalized.correctAnswer,
              position
            }))
          },
          versions: {
            create: {
              version: 1,
              snapshot: normalized,
              changedBy: session.user.id
            }
          }
        }
      })

      await tx.importItem.update({
        where: { id: item.id },
        data: { imported: true, questionId: question.id }
      })
      successfulCount++
    }
  })

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: failedCount === 0 ? "IMPORTED" : "PARTIAL",
      successfulCount,
      failedCount
    }
  })

  return noStore(NextResponse.json({ success: true, successfulCount, failedCount }))
}
