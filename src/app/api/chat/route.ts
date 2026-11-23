import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isAssignedChatReceiver, normalizeChatText } from "@/lib/chat-policy"
import { NextResponse } from "next/server"

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
  return response
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return noStore(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
  }

  let counselorId: string
  let receiverId: string

  if (session.user.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!profile?.counselorId) {
      return noStore(NextResponse.json({ messages: [] }))
    }

    counselorId = profile.counselorId
    receiverId = session.user.id
  } else if (session.user.role === "PARENT") {
    const profile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { student: true }
    })

    if (!profile?.student?.counselorId) {
      return noStore(NextResponse.json({ messages: [] }))
    }

    counselorId = profile.student.counselorId
    receiverId = session.user.id
  } else if (session.user.role === "COUNSELOR") {
    const requestedId = new URL(request.url).searchParams.get("receiverId")
    if (!requestedId) {
      return noStore(NextResponse.json({ error: "Missing receiver" }, { status: 400 }))
    }

    counselorId = session.user.id
    receiverId = requestedId
  } else {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  const chat = await prisma.chat.findFirst({
    where: {
      counselorId,
      OR: [{ studentId: receiverId }, { parentId: receiverId }]
    },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  })

  let unreadCount = 0
  if (chat) {
    unreadCount = await prisma.message.count({
      where: {
        chatId: chat.id,
        senderId: { not: session.user.id },
        readAt: null
      }
    })

    await prisma.message.updateMany({
      where: {
        chatId: chat.id,
        senderId: { not: session.user.id },
        readAt: null
      },
      data: { readAt: new Date() }
    })
    unreadCount = 0
  }

  const refreshedChat = chat
    ? await prisma.chat.findUnique({
        where: { id: chat.id },
        include: { messages: { orderBy: { createdAt: "asc" } } }
      })
    : null

  return noStore(NextResponse.json({
    unreadCount,
    messages: (refreshedChat?.messages || []).map((message) => ({
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() || null
    }))
  }))
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return noStore(NextResponse.json({ error: "Unauthorized" }, { status: 401 }))
  }

  const body = await request.json() as { receiverId?: string; content?: string }
  const content = normalizeChatText(body.content)
  if (!content) {
    return noStore(NextResponse.json({ error: "Invalid message" }, { status: 400 }))
  }

  let counselorId: string
  let receiverId: string
  let receiverIsParent = false

  if (session.user.role === "STUDENT") {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!profile?.counselorId) {
      return noStore(NextResponse.json({ error: "No counselor" }, { status: 400 }))
    }

    counselorId = profile.counselorId
    receiverId = session.user.id
  } else if (session.user.role === "PARENT") {
    const profile = await prisma.parentProfile.findUnique({
      where: { userId: session.user.id },
      include: { student: true }
    })

    if (!profile?.student?.counselorId) {
      return noStore(NextResponse.json({ error: "No counselor" }, { status: 400 }))
    }

    counselorId = profile.student.counselorId
    receiverId = session.user.id
    receiverIsParent = true
  } else if (session.user.role === "COUNSELOR") {
    if (!body.receiverId) {
      return noStore(NextResponse.json({ error: "Missing receiver" }, { status: 400 }))
    }

    const receiver = await prisma.user.findUnique({
      where: { id: body.receiverId },
      include: {
        studentProfile: true,
        parentProfile: { include: { student: true } }
      }
    })

    const isAssignedStudent = isAssignedChatReceiver({
      role: receiver?.role === "STUDENT" ? "STUDENT" : undefined,
      counselorId: session.user.id,
      studentCounselorId: receiver?.studentProfile?.counselorId
    })
    const isAssignedParent = isAssignedChatReceiver({
      role: receiver?.role === "PARENT" ? "PARENT" : undefined,
      counselorId: session.user.id,
      parentStudentCounselorId: receiver?.parentProfile?.student?.counselorId
    })

    if (!isAssignedStudent && !isAssignedParent) {
      return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
    }

    counselorId = session.user.id
    receiverId = body.receiverId
    receiverIsParent = isAssignedParent
  } else {
    return noStore(NextResponse.json({ error: "Forbidden" }, { status: 403 }))
  }

  let chat = await prisma.chat.findFirst({
    where: {
      counselorId,
      OR: [{ studentId: receiverId }, { parentId: receiverId }]
    }
  })

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        counselorId,
        studentId: receiverIsParent ? null : receiverId,
        parentId: receiverIsParent ? receiverId : null
      }
    })
  }

  await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: session.user.id,
      content
    }
  })

  return noStore(NextResponse.json({ success: true }))
}
