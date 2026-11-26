import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAuthorizedToChat } from "@/lib/chat-auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const receiverId = searchParams.get("receiverId")

  if (!receiverId) return NextResponse.json({ error: "گیرنده مشخص نشده است" }, { status: 400 })

  const isAuthorized = await isAuthorizedToChat(session.user.id, session.user.role, receiverId)
  if (!isAuthorized) {
    return NextResponse.json({ error: "شما مجاز به مشاهده این گفتگو نیستید" }, { status: 403 })
  }

  const chat = await prisma.chat.findFirst({
    where: {
      OR: [
        { counselorId: session.user.id, studentId: receiverId },
        { counselorId: session.user.id, parentId: receiverId },
        { counselorId: receiverId, studentId: session.user.id },
        { counselorId: receiverId, parentId: session.user.id }
      ]
    },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  })

  return NextResponse.json({ messages: chat?.messages || [] })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body;
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "فرمت درخواست نامعتبر است" }, { status: 400 })
  }

  const { receiverId, content } = body
  
  if (!receiverId || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "اطلاعات پیام ناقص یا نامعتبر است" }, { status: 400 })
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: "متن پیام بیش از حد طولانی است (حداکثر ۲۰۰۰ کاراکتر)" }, { status: 400 })
  }

  const isAuthorized = await isAuthorizedToChat(session.user.id, session.user.role, receiverId)
  if (!isAuthorized) {
    return NextResponse.json({ error: "شما مجاز به ارسال پیام به این کاربر نیستید" }, { status: 403 })
  }

  const existingChat = await prisma.chat.findFirst({
    where: {
      OR: [
        { counselorId: session.user.id, studentId: receiverId },
        { counselorId: session.user.id, parentId: receiverId },
        { counselorId: receiverId, studentId: session.user.id },
        { counselorId: receiverId, parentId: session.user.id }
      ]
    }
  })

  let chatId = existingChat?.id

  if (!chatId) {
    let chatData;
    if (session.user.role === "COUNSELOR") {
      const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
      if (!receiver) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
      
      chatData = {
        counselorId: session.user.id,
        studentId: receiver.role === "STUDENT" ? receiverId : null,
        parentId: receiver.role === "PARENT" ? receiverId : null,
      }
    } else {
      chatData = {
        counselorId: receiverId,
        studentId: session.user.role === "STUDENT" ? session.user.id : null,
        parentId: session.user.role === "PARENT" ? session.user.id : null,
      }
    }

    const newChat = await prisma.chat.create({ data: chatData })
    chatId = newChat.id
  }

  try {
    await prisma.message.create({
      data: { 
        chatId: chatId, 
        senderId: session.user.id, 
        content: content.trim() 
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Message creation failed:", error)
    return NextResponse.json({ error: "خطا در ذخیره پیام در دیتابیس" }, { status: 500 })
  }
}