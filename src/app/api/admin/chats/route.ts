import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 100

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز است." }, { status: 403 })
    }

    const url = new URL(request.url)
    const chatId = url.searchParams.get("chatId")

    if (chatId) {
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          messages: {
            orderBy: [
              { createdAt: "desc" },
              { id: "desc" },
            ],
            include: {
              sender: {
                select: { id: true, fullName: true, role: true },
              },
            },
          },
        },
      })

      if (!chat) {
        return NextResponse.json({ error: "گفتگو پیدا نشد." }, { status: 404 })
      }

      const participantIds = [chat.counselorId, chat.studentId, chat.parentId].filter(
        (id): id is string => Boolean(id)
      )

      const participants = await prisma.user.findMany({
        where: { id: { in: participantIds } },
        select: { id: true, fullName: true, role: true },
      })

      return NextResponse.json({
        chat: {
          id: chat.id,
          counselorId: chat.counselorId,
          studentId: chat.studentId,
          parentId: chat.parentId,
          participants,
          messages: chat.messages.reverse().map((message) => ({
            id: message.id,
            senderId: message.senderId,
            senderName: message.sender.fullName,
            senderRole: message.sender.role,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            readAt: message.readAt?.toISOString() ?? null,
          })),
        },
      })
    }

    const rawPage = Number(url.searchParams.get("page") ?? "1")
    const rawLimit = Number(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT))
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT
    const skip = (page - 1) * limit

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          messages: {
            orderBy: [
              { createdAt: "desc" },
              { id: "desc" },
            ],
            take: 1,
            include: {
              sender: {
                select: { id: true, fullName: true },
              },
            },
          },
        },
      }),
      prisma.chat.count(),
    ])

    const participantIds = Array.from(
      new Set(
        chats.flatMap((chat) =>
          [chat.counselorId, chat.studentId, chat.parentId].filter(
            (id): id is string => Boolean(id)
          )
        )
      )
    )

    const participants = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, fullName: true, role: true },
    })
    const participantMap = new Map(participants.map((participant) => [participant.id, participant]))

    return NextResponse.json({
      chats: chats.map((chat) => {
        const lastMessage = chat.messages[0]

        return {
          id: chat.id,
          counselor: participantMap.get(chat.counselorId) ?? null,
          student: chat.studentId ? participantMap.get(chat.studentId) ?? null : null,
          parent: chat.parentId ? participantMap.get(chat.parentId) ?? null : null,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                senderName: lastMessage.sender.fullName,
                createdAt: lastMessage.createdAt.toISOString(),
              }
            : null,
          createdAt: chat.createdAt.toISOString(),
        }
      }),
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error("[admin chats GET] error:", error)
    return NextResponse.json(
      { error: "خطا در دریافت گفتگوها." },
      { status: 500 }
    )
  }
}
