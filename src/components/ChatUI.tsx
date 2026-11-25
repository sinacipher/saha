"use client"
import { useState, useEffect, useRef } from "react"

export default function ChatUI({ currentUserId, receiverId, receiverName }: { currentUserId: string, receiverId: string, receiverName: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    const res = await fetch(`/api/chat?receiverId=${receiverId}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages)
    }
  }

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 3000) // هر ۳ ثانیه آپدیت می‌شود
    return () => clearInterval(interval)
  }, [receiverId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    const content = input
    setInput("")
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiverId, content })
    })
    await loadMessages()
  }

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-xl bg-card shadow-sm">
      <div className="p-4 border-b border-border bg-muted/20 font-bold">
        گفتگو با {receiverName}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted text-foreground rounded-tl-none'}`}>
                {msg.content}
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
        <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition">
          ارسال
        </button>
      </form>
    </div>
  )
}