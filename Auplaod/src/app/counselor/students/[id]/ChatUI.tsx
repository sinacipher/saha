"use client"

import { useState, useEffect, useRef, useCallback } from "react"

type ChatMessage = {
  id: string
  senderId: string
  content: string
  createdAt: string
  readAt: string | null
}

type ChatStudent = {
  id: string
  fullName: string | null
}

type ChatParent = {
  user: {
    id: string
    fullName: string | null
  }
}

export default function ChatUI({ counselorId, student, parents }: {
  counselorId: string
  student: ChatStudent
  parents: ChatParent[]
}) {
  const [activeReceiverId, setActiveReceiverId] = useState(student.id)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ترکیب دانش‌آموز و والدین در یک لیست مخاطبین
  const contacts = [
    { id: student.id, name: student.fullName, role: "دانش‌آموز" },
    ...parents.map((parent) => ({ id: parent.user.id, name: parent.user.fullName || "والد", role: "والدین" }))
  ]

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/chat?_=${Date.now()}&receiverId=${encodeURIComponent(activeReceiverId)}`, {
      cache: "no-store"
    })
    if (!response.ok) return

    const data = await response.json() as { messages: ChatMessage[] }
    setMessages(data.messages)
  }, [activeReceiverId])

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId: activeReceiverId, content: input })
    })
    if (response.ok) {
      setInput("")
      await loadMessages()
    }
    setLoading(false)
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      
      {/* ستون مخاطبین */}
      <div className="w-1/3 border-l border-border bg-muted/20 flex flex-col">
        <div className="p-4 border-b border-border font-bold">مخاطبین</div>
        <div className="overflow-y-auto flex-1">
          {contacts.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveReceiverId(c.id)}
              className={`w-full text-right p-4 border-b border-border hover:bg-muted transition ${activeReceiverId === c.id ? 'bg-muted' : ''}`}
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.role}</div>
            </button>
          ))}
        </div>
      </div>

      {/* محیط چت */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border bg-muted/10 font-bold flex justify-between items-center">
          <span>{contacts.find(c => c.id === activeReceiverId)?.name}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isMe = m.senderId === counselorId
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                  <div>{m.content}</div>
                  <div className="mt-1 text-[11px] opacity-70">
                    {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(m.createdAt))}
                    {isMe && m.readAt && " · خوانده شده"}
                  </div>
                </div>
              </div>
            )
          })}
          {messages.length === 0 && <p className="text-center text-muted-foreground mt-10">پیامی وجود ندارد. شروع به چت کنید!</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
          />
          <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50">
            ارسال
          </button>
        </form>
      </div>
    </div>
  )
}