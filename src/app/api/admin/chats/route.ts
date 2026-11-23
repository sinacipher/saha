import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const chatId = new URL(request.url).searchParams.get("chatId")

  if (chatId) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true }
        }
      }
    })

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const participantIds = [chat.counselorId, chat.studentId, chat.parentId].filter((id): id is string => !!id)
    const participants = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, fullName: true, role: true }
    })

    return NextResponse.json({
      chat: {
        id: chat.id,
        counselorId: chat.counselorId,
        studentId: chat.studentId,
        parentId: chat.parentId,
        participants,
        messages: chat.messages.map((message) => ({
          id: message.id,
          senderId: message.senderId,
          senderName: message.sender.fullName,
          senderRole: message.sender.role,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          readAt: message.readAt?.toISOString() || null
        }))
      }
    })
  }

  const chats = await prisma.chat.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: true }
      }
    }
  })

  const participantIds = Array.from(new Set(chats.flatMap((chat) => [chat.counselorId, chat.studentId, chat.parentId].filter((id): id is string => !!id))))
  const participants = await prisma.user.findMany({
    where: { id: { in: participantIds } },
    select: { id: true, fullName: true, role: true, phone: true }
  })
  const participantMap = new Map(participants.map((participant) => [participant.id, participant]))

  return NextResponse.json({
    chats: chats.map((chat) => {
      const lastMessage = chat.messages[0]
      return {
        id: chat.id,
        counselor: participantMap.get(chat.counselorId) || null,
        student: chat.studentId ? participantMap.get(chat.studentId) || null : null,
        parent: chat.parentId ? participantMap.get(chat.parentId) || null : null,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          senderName: lastMessage.sender.fullName,
          createdAt: lastMessage.createdAt.toISOString()
        } : null,
        createdAt: chat.createdAt.toISOString()
      }
    })
  })
}
