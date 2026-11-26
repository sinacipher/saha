import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let whereClause = {}

  // Admin sees everything
  if (session.user.role === "ADMIN") {
    whereClause = {}
  } 
  // Counselor only sees exams they created
  else if (session.user.role === "COUNSELOR") {
    whereClause = { createdById: session.user.id }
  } 
  // Student sees all published exams (or restrict further if you have specific assignments)
  else if (session.user.role === "STUDENT") {
    whereClause = { startAt: { not: null } } // Example: only exams with a start date are published
  } 
  // Parents get nothing
  else {
    return NextResponse.json([]) 
  }

  // 👇 SECURITY FIX: Remove fileData and answerKeyJson from the list response
  const exams = await prisma.simpleExam.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      questionCount: true,
      durationMinutes: true,
      startAt: true,
      endAt: true,
      fileName: true,
      fileType: true
      // Note: fileData and answerKeyJson are explicitly excluded here
    }
  })

  return NextResponse.json(exams)
}