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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  // Authorization check (unchanged)
  const isAuthorized = await isAuthorizedToChat(session.user.id, session.user.role, receiverId)
  if (!isAuthorized) {
    return NextResponse.json({ error: "شما مجاز به ارسال پیام به این کاربر نیستید" }, { status: 403 })
  }

  const RATE_LIMIT = 20
  const WINDOW_MS = 60 * 1000
  const windowStart = new Date(Date.now() - WINDOW_MS)

  try {
    // ─────────────────────────────────────────────
    // Rate limit + insert in a single serializable transaction
    // ─────────────────────────────────────────────
    await prisma.$transaction(
      async (tx) => {
        const recentCount = await tx.message.count({
          where: {
            senderId: session.user.id,
            createdAt: { gte: windowStart },
          },
        })

        if (recentCount >= RATE_LIMIT) {
          throw new Error("RATE_LIMITED")
        }

        // Find or create chat inside the same transaction
        let chatId = (
          await tx.chat.findFirst({
            where: {
              OR: [
                { counselorId: session.user.id, studentId: receiverId },
                { counselorId: session.user.id, parentId: receiverId },
                { counselorId: receiverId, studentId: session.user.id },
                { counselorId: receiverId, parentId: session.user.id },
              ],
            },
          })
        )?.id

        if (!chatId) {
          let chatData;
          if (session.user.role === "COUNSELOR") {
            const receiver = await tx.user.findUnique({ where: { id: receiverId } })
            if (!receiver) throw new Error("RECEIVER_NOT_FOUND")
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
          const newChat = await tx.chat.create({ data: chatData })
          chatId = newChat.id
        }

        await tx.message.create({
          data: { chatId, senderId: session.user.id, content: content.trim() },
        })
      },
      { isolationLevel: "Serializable" }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RATE_LIMITED") {
        const retryAfter = Math.ceil(WINDOW_MS / 1000)
        return NextResponse.json(
          { error: "تعداد پیام‌های ارسالی بیش از حد مجاز است. لطفاً کمی صبر کنید." },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
          }
        )
      }
      if (error.message === "RECEIVER_NOT_FOUND") {
        return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
      }
    }

    // Prisma transaction conflict (concurrent retries exhausted)
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code
      if (code === "P2034" || code === "P2002") {
        return NextResponse.json(
          { error: "درخواست شما با درخواست دیگری تداخل داشت. لطفاً دوباره تلاش کنید." },
          { status: 429, headers: { "Retry-After": "5" } }
        )
      }
    }

    console.error("[chat POST] error:", error)
    return NextResponse.json({ error: "خطا در ذخیره پیام" }, { status: 500 })
  }
}