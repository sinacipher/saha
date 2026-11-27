import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { isAuthorizedToChat } from "@/lib/chat-auth"

export const runtime = "nodejs"

const MAX_MESSAGE_LENGTH = 2000
const PAGE_SIZE = 50
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return apiError("ابتدا وارد حساب شوید.", 401)
    }

    if (session.user.role === "ADMIN") {
      return apiError("گفتگوهای مدیر فقط در بخش مشاهده گفتگوها قابل دسترسی هستند.", 403)
    }

    const { searchParams } = new URL(request.url)
    const receiverId = searchParams.get("receiverId")
    const beforeId = searchParams.get("beforeId")

    if (!receiverId) {
      return apiError("گیرنده گفتگو مشخص نشده است.", 400)
    }

    const authorized = await isAuthorizedToChat(
      session.user.id,
      session.user.role,
      receiverId
    )

    if (!authorized) {
      return apiError("شما مجاز به مشاهده این گفتگو نیستید.", 403)
    }

    const chat = await prisma.chat.findFirst({
      where: {
        OR: [
          { counselorId: session.user.id, studentId: receiverId },
          { counselorId: session.user.id, parentId: receiverId },
          { counselorId: receiverId, studentId: session.user.id },
          { counselorId: receiverId, parentId: session.user.id },
        ],
      },
      include: {
        messages: {
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          take: PAGE_SIZE + 1,
          ...(beforeId ? { cursor: { id: beforeId }, skip: 1 } : {}),
        },
      },
    })

    if (!chat) {
      return NextResponse.json({ messages: [], hasMore: false })
    }

    const hasMore = chat.messages.length > PAGE_SIZE
    const pageMessages = chat.messages.slice(0, PAGE_SIZE)
    const incomingIds = pageMessages
      .filter((message) => message.senderId !== session.user.id && !message.readAt)
      .map((message) => message.id)

    let readAt: Date | null = null

    if (incomingIds.length > 0) {
      readAt = new Date()
      await prisma.message.updateMany({
        where: {
          id: { in: incomingIds },
          readAt: null,
        },
        data: { readAt },
      })
    }

    const messages = pageMessages.reverse().map((message) => ({
      id: message.id,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? (
        message.senderId !== session.user.id && incomingIds.includes(message.id)
          ? readAt?.toISOString() ?? null
          : null
      ),
    }))

    return NextResponse.json({ messages, hasMore })
  } catch (error) {
    console.error("[chat GET] error:", error)
    return apiError("خطا در دریافت پیام‌های گفتگو.", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return apiError("ابتدا وارد حساب شوید.", 401)
    }

    if (session.user.role === "ADMIN") {
      return apiError("حساب مدیر در این بخش فقط اجازه مشاهده گفتگوها را دارد.", 403)
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return apiError("فرمت درخواست نامعتبر است.", 400)
    }

    if (!body || typeof body !== "object") {
      return apiError("اطلاعات پیام نامعتبر است.", 400)
    }

    const payload = body as { receiverId?: unknown; content?: unknown }
    const receiverId = payload.receiverId
    const content = payload.content

    if (
      typeof receiverId !== "string" ||
      !receiverId.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return apiError("گیرنده و متن پیام الزامی هستند.", 400)
    }

    const normalizedContent = content.trim()

    if (normalizedContent.length > MAX_MESSAGE_LENGTH) {
      return apiError(`حداکثر طول پیام ${MAX_MESSAGE_LENGTH} کاراکتر است.`, 400)
    }

    const authorized = await isAuthorizedToChat(
      session.user.id,
      session.user.role,
      receiverId
    )

    if (!authorized) {
      return apiError("شما مجاز به ارسال پیام به این کاربر نیستید.", 403)
    }

    const windowStart = new Date(Date.now() - RATE_WINDOW_MS)

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
            select: { id: true },
          })
        )?.id

        if (!chatId) {
          const receiver = await tx.user.findUnique({
            where: { id: receiverId },
            select: { id: true, role: true },
          })

          if (!receiver) throw new Error("RECEIVER_NOT_FOUND")

          let chatData: {
            counselorId: string
            studentId: string | null
            parentId: string | null
          }

          if (session.user.role === "COUNSELOR") {
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
          data: {
            chatId,
            senderId: session.user.id,
            content: normalizedContent,
          },
        })
      },
      { isolationLevel: "Serializable" }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "تعداد پیام‌های ارسالی بیش از حد مجاز است. لطفاً کمی صبر کنید." },
        { status: 429, headers: { "Retry-After": String(RATE_WINDOW_MS / 1000) } }
      )
    }

    if (error instanceof Error && error.message === "RECEIVER_NOT_FOUND") {
      return apiError("کاربر موردنظر پیدا نشد.", 404)
    }

    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code
      if (code === "P2034" || code === "P2002") {
        return NextResponse.json(
          { error: "درخواست با عملیات دیگری تداخل داشت. دوباره تلاش کنید." },
          { status: 429, headers: { "Retry-After": "5" } }
        )
      }
    }

    console.error("[chat POST] error:", error)
    return apiError("خطا در ذخیره پیام.", 500)
  }
}
