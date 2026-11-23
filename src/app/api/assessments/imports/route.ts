import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !["ADMIN", "COUNSELOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const batchId = new URL(request.url).searchParams.get("batchId")

  if (batchId) {
    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        items: { orderBy: { rowNumber: "asc" } }
      }
    })

    if (!batch) return NextResponse.json({ error: "Batch یافت نشد" }, { status: 404 })
    if (session.user.role === "COUNSELOR" && batch.importingUserId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ batch })
  }

  const batches = await prisma.importBatch.findMany({
    where: session.user.role === "COUNSELOR" ? { importingUserId: session.user.id } : {},
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { items: true } }
    }
  })

  const importerIds = Array.from(new Set(batches.map((batch) => batch.importingUserId)))
  const importers = await prisma.user.findMany({
    where: { id: { in: importerIds } },
    select: { id: true, fullName: true }
  })
  const importerMap = new Map(importers.map((importer) => [importer.id, importer.fullName]))

  return NextResponse.json({
    batches: batches.map((batch) => ({
      id: batch.id,
      originalName: batch.originalName,
      format: batch.format,
      status: batch.status,
      totalFound: batch.totalFound,
      successfulCount: batch.successfulCount,
      failedCount: batch.failedCount,
      warningCount: batch.warningCount,
      importingUserName: importerMap.get(batch.importingUserId) || "کاربر",
      createdAt: batch.createdAt.toISOString(),
      itemCount: batch._count.items
    }))
  })
}
