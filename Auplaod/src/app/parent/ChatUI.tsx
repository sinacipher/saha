"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type ChatMessage = {
  id: string
  senderId: string
  content: string
  createdAt: string
  readAt: string | null
}

export default function ParentChatUI({
  parentId,
  counselorName,
  unreadCount
}: {
  parentId: string
  counselorName: string
  unreadCount: number
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [liveUnreadCount, setLiveUnreadCount] = useState(unreadCount)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/chat?_=${Date.now()}`, { cache: "no-store" })
    if (!response.ok) return

    const data = await response.json() as { messages: ChatMessage[]; unreadCount: number }
    setMessages(data.messages)
    setLiveUnreadCount(data.unreadCount)
  }, [])

  useEffect(() => {
    const initialLoad = setTimeout(loadMessages, 0)
    const interval = setInterval(loadMessages, 1000)
    return () => {
      clearTimeout(initialLoad)
      clearInterval(interval)
    }
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input })
    })

    if (response.ok) {
      setInput("")
      await loadMessages()
    }
    setLoading(false)
  }

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex w-64 flex-col border-l border-border bg-muted/20">
        <div className="border-b border-border p-4 font-bold">مخاطب</div>
        <div className="p-4">
          <div className="font-medium">{counselorName}</div>
          <div className="mt-1 text-xs text-muted-foreground">مشاور</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-muted/10 p-4 font-bold">
          <span>گفت‌وگو با {counselorName}</span>
          {liveUnreadCount > 0 && (
            <span className="min-w-6 rounded-full bg-primary px-2 py-1 text-center text-xs text-primary-foreground">
              {liveUnreadCount}
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => {
            const isMe = message.senderId === parentId
            return (
              <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-xl p-3 text-sm ${isMe ? "rounded-tr-none bg-primary text-primary-foreground" : "rounded-tl-none bg-muted text-foreground"}`}>
                  <div>{message.content}</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.createdAt))}
                    {isMe && message.readAt && " · خوانده شده"}
                  </div>
                </div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <p className="mt-10 text-center text-muted-foreground">پیامی وجود ندارد. شروع به چت کنید!</p>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex gap-2 border-t border-border p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            ارسال
          </button>
        </form>
      </div>
    </div>
  )
}
