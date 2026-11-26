"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const PAGE_SIZE = 50

type Participant = {
  id: string
  fullName: string | null
  role: "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"
  phone?: string
}

type ChatSummary = {
  id: string
  counselor: Participant | null
  student: Participant | null
  parent: Participant | null
  lastMessage: { content: string; senderName: string | null; createdAt: string } | null
  createdAt: string
}

type ChatMessage = {
  id: string
  senderId: string
  senderName: string | null
  senderRole: "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"
  content: string
  createdAt: string
}

export default function AdminChatViewer() {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedChatId, setSelectedChatId] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadChat = useCallback(async (chatId: string) => {
    const response = await fetch(`/api/admin/chats?chatId=${encodeURIComponent(chatId)}`, {
      cache: "no-store",
    })
    if (!response.ok) return

    const data = (await response.json()) as {
      chat: { messages: ChatMessage[]; participants: Participant[] }
    }
    setMessages(data.chat.messages)
  }, [])

  const loadChats = useCallback(
    async (targetPage: number) => {
      const response = await fetch(`/api/admin/chats?page=${targetPage}&limit=${PAGE_SIZE}`, {
        cache: "no-store",
      })
      if (!response.ok) return

      const data = (await response.json()) as {
        chats: ChatSummary[]
        total: number
      }
      setChats(data.chats)
      setTotal(data.total)
      if (!selectedChatId && data.chats[0]) {
        setSelectedChatId(data.chats[0].id)
        await loadChat(data.chats[0].id)
      }
    },
    [loadChat, selectedChatId]
  )

  useEffect(() => {
    const initialLoad = setTimeout(() => {
      setLoading(true)
      loadChats(page).finally(() => setLoading(false))
    }, 0)
    const interval = setInterval(() => loadChats(page), 3000)
    return () => {
      clearTimeout(initialLoad)
      clearInterval(interval)
    }
  }, [loadChats, page])

  useEffect(() => {
    if (!selectedChatId) return
    const initialLoad = setTimeout(() => loadChat(selectedChatId), 0)
    const interval = setInterval(() => loadChat(selectedChatId), 2000)
    return () => {
      clearTimeout(initialLoad)
      clearInterval(interval)
    }
  }, [loadChat, selectedChatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const endItem = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <aside className="flex w-80 flex-col border-l border-border bg-muted/20">
        <div className="border-b border-border p-4 font-bold">همه گفتگوها</div>

        <div className="flex-1 overflow-y-auto">
          {loading && chats.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">در حال بارگذاری...</p>
          )}
          {!loading && chats.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">گفت‌وگویی وجود ندارد.</p>
          )}
          {chats.map((chat) => {
            const receiver = chat.student || chat.parent
            return (
              <button
                key={chat.id}
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full border-b border-border p-4 text-right transition hover:bg-muted ${
                  selectedChatId === chat.id ? "bg-muted" : ""
                }`}
              >
                <div className="font-medium">
                  {chat.counselor?.fullName || "مشاور"} ← {receiver?.fullName || "مخاطب"}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {chat.lastMessage
                    ? `${chat.lastMessage.senderName || "کاربر"}: ${chat.lastMessage.content}`
                    : "پیامی وجود ندارد"}
                </div>
              </button>
            )
          })}
        </div>

        {/* Pagination footer */}
        {total > 0 && (
          <div className="space-y-2 border-t border-border p-3">
            <p className="text-center text-xs text-muted-foreground">
              نمایش {startItem}–{endItem} از {total} گفتگو
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-muted disabled:opacity-40"
              >
                قبلی
              </button>
              <span className="text-xs font-medium">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:bg-muted disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </div>
        )}
      </aside>

      <section className="flex flex-1 flex-col">
        <div className="border-b border-border p-4 font-bold">
          {selectedChat?.counselor?.fullName || "مشاور"}
          {selectedChat?.student && ` — دانش‌آموز: ${selectedChat.student.fullName}`}
          {selectedChat?.parent && ` — والد: ${selectedChat.parent.fullName}`}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <div key={message.id} className="flex justify-start">
              <div className="max-w-[75%] rounded-xl rounded-tl-none bg-muted p-3 text-sm">
                <div className="mb-1 text-xs font-bold text-muted-foreground">
                  {message.senderName || "کاربر"} — {message.senderRole}
                </div>
                <div>{message.content}</div>
                <div className="mt-1 text-[11px] opacity-70">
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(message.createdAt))}
                </div>
              </div>
            </div>
          ))}
          {selectedChatId && messages.length === 0 && (
            <p className="mt-10 text-center text-muted-foreground">پیامی وجود ندارد.</p>
          )}
          {!selectedChatId && (
            <p className="mt-10 text-center text-muted-foreground">
              یک گفت‌وگو را انتخاب کنید.
            </p>
          )}
          <div ref={bottomRef} />
        </div>
      </section>
    </div>
  )
}