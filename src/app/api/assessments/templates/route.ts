import { auth } from "@/auth"
import ExcelJS from "exceljs"
import { Document, Packer, Paragraph, TextRun } from "docx"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const format = new URL(request.url).searchParams.get("format")

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "سحا"

    const questions = workbook.addWorksheet("Questions")
    questions.addRow([
      "Question ID", "Subject", "Chapter", "Topic", "Difficulty",
      "Question", "Option A", "Option B", "Option C", "Option D",
      "Correct Answer", "Explanation", "Tags", "Source", "Passage ID"
    ])
    questions.addRow(["Q-001", "زیست‌شناسی", "ژنتیک", "DNA", "Medium", "متن نمونه سؤال", "گزینه الف", "گزینه ب", "گزینه ج", "گزینه د", "C", "توضیح پاسخ", "ژنتیک, DNA", "سازنده: سحا", ""])
    questions.getRow(1).font = { bold: true }

    const passages = workbook.addWorksheet("Passages")
    passages.addRow(["Passage ID", "Subject", "Passage Title", "Passage Content"])
    passages.addRow(["P-001", "زیست‌شناسی", "عنوان متن", "متن مشترک سؤال..."])

    const instructions = workbook.addWorksheet("Instructions")
    instructions.addRow(["فیلد", "توضیح", "مقدار مجاز"])
    instructions.addRows([
      ["Difficulty", "سطح دشواری", "Easy / Medium / Hard یا آسان / متوسط / سخت"],
      ["Correct Answer", "گزینه صحیح", "A / B / C / D و یا الف / ب / ج / د"],
      ["Required", "فیلدهای ضروری", "Subject, Question, گزینه‌ها و پاسخ صحیح"],
      ["Language", "زبان", "متن فارسی، لاتین و نمادهای ریاضی قابل قبول است"],
      ["Passage ID", "شناسه متن مشترک", "باید با Sheet Passages تطابق داشته باشد"]
    ])

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=assessment-question-template.xlsx",
        "Cache-Control": "no-store"
      }
    })
  }

  if (format === "docx") {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: "قالب واردسازی سوالات سحا", rightToLeft: true })] }),
          new Paragraph({ text: "Question 001" }),
          new Paragraph({ text: "Subject: زیست‌شناسی" }),
          new Paragraph({ text: "Chapter: ژنتیک" }),
          new Paragraph({ text: "Difficulty: Medium" }),
          new Paragraph({ text: "Question: متن سؤال" }),
          new Paragraph({ text: "A) گزینه الف" }),
          new Paragraph({ text: "B) گزینه ب" }),
          new Paragraph({ text: "C) گزینه ج" }),
          new Paragraph({ text: "D) گزینه د" }),
          new Paragraph({ text: "Correct Answer: C" }),
          new Paragraph({ text: "Explanation: توضیح پاسخ" }),
          new Paragraph({ text: "Tags: ژنتیک, DNA" }),
          new Paragraph({ text: "Source: منبع" })
        ]
      }]
    })

    const buffer = await Packer.toBuffer(doc)
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=assessment-question-template.docx",
        "Cache-Control": "no-store"
      }
    })
  }

  return NextResponse.json({ error: "Supported formats: xlsx or docx" }, { status: 400 })
}
