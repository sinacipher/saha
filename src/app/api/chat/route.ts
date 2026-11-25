import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// دریافت پیام‌های یک اتاق چت
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const receiverId = searchParams.get("receiverId")

  if (!receiverId) return NextResponse.json({ error: "گیرنده مشخص نشده" }, { status: 400 })

  // پیدا کردن یا ساختن اتاق چت
  let chat = await prisma.chat.findFirst({
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

// ارسال پیام جدید
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const { receiverId, content } = body

  if (!receiverId || !content) return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 })

  let chat = await prisma.chat.findFirst({
    where: {
      OR: [
        { counselorId: session.user.id, studentId: receiverId },
        { counselorId: session.user.id, parentId: receiverId },
        { counselorId: receiverId, studentId: session.user.id },
        { counselorId: receiverId, parentId: session.user.id }
      ]
    }
  })

  if (!chat) {
    // اگر اتاق وجود ندارد، با توجه به نقش کاربر آن را می‌سازیم
    if (session.user.role === "COUNSELOR") {
      const receiver = await prisma.user.findUnique({ where: { id: receiverId } })
      chat = await prisma.chat.create({
        data: {
          counselorId: session.user.id,
          studentId: receiver?.role === "STUDENT" ? receiverId : null,
          parentId: receiver?.role === "PARENT" ? receiverId : null,
        }
      })
    } else {
      // اگر فرستنده دانش‌آموز یا والد باشد، گیرنده باید مشاور باشد
      chat = await prisma.chat.create({
        data: {
          counselorId: receiverId,
          studentId: session.user.role === "STUDENT" ? session.user.id : null,
          parentId: session.user.role === "PARENT" ? session.user.id : null,
        }
      })
    }
  }

  await prisma.message.create({
    data: {
      chatId: chat.id,
      senderId: session.user.id,
      content
    }
  })

  return NextResponse.json({ success: true })
}