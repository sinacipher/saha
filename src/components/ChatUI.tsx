"use client"
import { useState, useEffect, useRef, useCallback } from "react"

type Message = { id: string; senderId: string; content: string; createdAt: string }

export default function ChatUI({ currentUserId, receiverId, receiverName }: { currentUserId: string, receiverId: string, receiverName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat?receiverId=${receiverId}`)
      if (!res.ok) throw new Error("خطا در دریافت پیام‌ها")
      const data = await res.json()
      setMessages(data.messages)
      setError("")
    } catch (err) {
      if (err instanceof Error) setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [receiverId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedInput = input.trim()
    if (!trimmedInput || isSending) return

    setIsSending(true)
    setError("")
    
    // Optimistic UI Update (Optional, but makes it feel fast)
    const tempId = Date.now().toString()
    const optimisticMsg = { id: tempId, senderId: currentUserId, content: trimmedInput, createdAt: new Date().toISOString() }
    setMessages(prev => [...prev, optimisticMsg])
    setInput("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, content: trimmedInput })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "خطا در ارسال پیام")
      }
      await loadMessages() // Re-fetch to get real ID and order
    } catch (err) {
      if (err instanceof Error) setError(err.message)
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-xl bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20 font-bold flex justify-between items-center">
        <span>گفتگو با {receiverName}</span>
        {error && <span className="text-xs text-red-500 font-normal">{error}</span>}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
        {isLoading && messages.length === 0 && (
          <p className="text-center text-muted-foreground mt-10">در حال بارگذاری پیام‌ها...</p>
        )}
        
        {!isLoading && messages.length === 0 && (
          <p className="text-center text-muted-foreground mt-10">پیامی وجود ندارد. شروع به چت کنید!</p>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-xl text-sm ${
                isMe 
                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                  : 'bg-muted text-foreground rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2 bg-card">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="پیام خود را بنویسید..."
          className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:outline-none"
          disabled={isSending}
        />
        <button 
          type="submit" 
          disabled={isSending || !input.trim()} 
          className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {isSending ? "ارسال..." : "ارسال"}
        </button>
      </form>
    </div>
  )
}