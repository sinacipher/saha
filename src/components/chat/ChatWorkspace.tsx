"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  UserRound,
} from "lucide-react"
import { useFeedback } from "@/components/feedback/FeedbackProvider"

export type ChatContact = {
  id: string
  name: string
  role: string
}

type ChatMessage = {
  id: string
  senderId: string
  content: string
  createdAt: string
  readAt: string | null
}

type ChatWorkspaceProps = {
  currentUserId: string
  contacts: ChatContact[]
  title?: string
  initialReceiverId?: string
}

const POLL_INTERVAL = 5000
const MAX_MESSAGE_LENGTH = 2000

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]).join("") || "؟"
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function sameDay(a: string, b: string) {
  const left = new Date(a)
  const right = new Date(b)
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
}

export default function ChatWorkspace({
  currentUserId,
  contacts,
  title = "گفت‌وگوها",
  initialReceiverId,
}: ChatWorkspaceProps) {
  const { notify } = useFeedback()
  const safeInitialId = contacts.some((contact) => contact.id === initialReceiverId)
    ? initialReceiverId!
    : contacts[0]?.id ?? ""

  const [activeReceiverId, setActiveReceiverId] = useState(safeInitialId)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(Boolean(safeInitialId))
  const [isSending, setIsSending] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState("")
  const [showContacts, setShowContacts] = useState(contacts.length > 1)

  const messagesRef = useRef<ChatMessage[]>([])
  const messageListRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottomRef = useRef(true)
  const requestIdRef = useRef(0)

  const activeContact = useMemo(
    () => contacts.find((contact) => contact.id === activeReceiverId) ?? null,
    [contacts, activeReceiverId]
  )

  const syncMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next
    setMessages(next)
  }, [])

  const loadMessages = useCallback(async (merge = true) => {
    if (!activeReceiverId) return

    const requestId = ++requestIdRef.current

    try {
      const response = await fetch(
        `/api/chat?receiverId=${encodeURIComponent(activeReceiverId)}`,
        { cache: "no-store" }
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "دریافت پیام‌ها ناموفق بود.")
      }

      if (requestId !== requestIdRef.current) return

      const incoming = Array.isArray(data?.messages)
        ? data.messages as ChatMessage[]
        : []

      if (merge && messagesRef.current.length > 0) {
        const byId = new Map(messagesRef.current.map((message) => [message.id, message]))
        incoming.forEach((message) => byId.set(message.id, message))
        const combined = Array.from(byId.values()).sort((a, b) => {
          const timeDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          return timeDifference || a.id.localeCompare(b.id)
        })
        syncMessages(combined)
      } else {
        syncMessages(incoming)
      }

      setHasMore(Boolean(data?.hasMore))
      setError("")
    } catch (loadError) {
      const message = loadError instanceof Error
        ? loadError.message
        : "خطا در دریافت پیام‌ها."
      setError(message)
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false)
    }
  }, [activeReceiverId, syncMessages])

  useEffect(() => {
  if (!activeReceiverId) {
    return
  }

    const startTimer = window.setTimeout(() => {
      setIsLoading(true)
      void loadMessages(false)
    }, 0)

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadMessages(true)
      }
    }, POLL_INTERVAL)

    return () => {
      window.clearTimeout(startTimer)
      window.clearInterval(interval)
      requestIdRef.current += 1
    }
  }, [activeReceiverId, loadMessages])

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages])

  const chooseContact = (contactId: string) => {
    if (contactId === activeReceiverId) {
      setShowContacts(false)
      return
    }

    requestIdRef.current += 1
    messagesRef.current = []
    setMessages([])
    setActiveReceiverId(contactId)
    setError("")
    setHasMore(false)
    setIsLoading(true)
    setShowContacts(false)
    shouldStickToBottomRef.current = true
  }

  const loadOlderMessages = async () => {
    const firstMessage = messagesRef.current[0]
    if (!activeReceiverId || !firstMessage || isLoadingOlder || !hasMore) return

    const container = messageListRef.current
    const oldHeight = container?.scrollHeight ?? 0
    setIsLoadingOlder(true)

    try {
      const response = await fetch(
        `/api/chat?receiverId=${encodeURIComponent(activeReceiverId)}&beforeId=${encodeURIComponent(firstMessage.id)}`,
        { cache: "no-store" }
      )
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "دریافت پیام‌های قبلی ناموفق بود.")

      const older = Array.isArray(data?.messages) ? data.messages as ChatMessage[] : []
      const byId = new Map<string, ChatMessage>()
      older.forEach((message) => byId.set(message.id, message))
      messagesRef.current.forEach((message) => byId.set(message.id, message))
      const combined = Array.from(byId.values()).sort((a, b) => {
        const timeDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return timeDifference || a.id.localeCompare(b.id)
      })

      shouldStickToBottomRef.current = false
      syncMessages(combined)
      setHasMore(Boolean(data?.hasMore))

      window.requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - oldHeight
      })
    } catch (loadError) {
      notify({
        title: "دریافت پیام‌های قبلی ناموفق بود",
        description: loadError instanceof Error ? loadError.message : "خطای نامشخص",
        variant: "error",
      })
    } finally {
      setIsLoadingOlder(false)
    }
  }

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault()
    const content = input.trim()

    if (!content || !activeReceiverId || isSending) return

    if (content.length > MAX_MESSAGE_LENGTH) {
      notify({
        title: "پیام بیش از حد طولانی است",
        description: `حداکثر طول پیام ${MAX_MESSAGE_LENGTH} کاراکتر است.`,
        variant: "warning",
      })
      return
    }

    setIsSending(true)
    setError("")
    shouldStickToBottomRef.current = true

    const temporaryId = `temp-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: temporaryId,
      senderId: currentUserId,
      content,
      createdAt: new Date().toISOString(),
      readAt: null,
    }

    syncMessages([...messagesRef.current, optimisticMessage])
    setInput("")

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeReceiverId, content }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "ارسال پیام ناموفق بود.")
      }

      syncMessages(messagesRef.current.filter((message) => message.id !== temporaryId))
      await loadMessages(true)
    } catch (sendError) {
      syncMessages(messagesRef.current.filter((message) => message.id !== temporaryId))
      setInput(content)
      const message = sendError instanceof Error ? sendError.message : "خطا در ارسال پیام."
      setError(message)
      notify({ title: "پیام ارسال نشد", description: message, variant: "error" })
    } finally {
      setIsSending(false)
    }
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void sendMessage()
    }
  }

  if (contacts.length === 0) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h2 className="font-bold">مخاطبی برای گفتگو وجود ندارد</h2>
        <p className="mt-2 text-sm text-muted-foreground">پس از تعیین ارتباط دانش‌آموز یا مشاور، گفتگو در این بخش نمایش داده می‌شود.</p>
      </section>
    )
  }

  return (
    <section className="relative flex h-[min(760px,calc(100dvh-11rem))] min-h-[480px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <aside className={`${showContacts ? "flex" : "hidden"} w-full shrink-0 flex-col bg-muted/20 md:flex md:w-[290px] md:border-l md:border-border`}>
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{contacts.length} مخاطب</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {contacts.map((contact) => {
            const selected = contact.id === activeReceiverId
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => chooseContact(contact.id)}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-right transition ${selected ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                  {initials(contact.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{contact.name}</span>
                  <span className={`mt-1 block text-xs ${selected ? "text-primary/80" : "text-muted-foreground"}`}>{contact.role}</span>
                </span>
                {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
              </button>
            )
          })}
        </div>
      </aside>

      <div className={`${showContacts ? "hidden" : "flex"} min-w-0 flex-1 flex-col md:flex`}>
        <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setShowContacts(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted md:hidden"
            aria-label="بازگشت به مخاطبین"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
            {activeContact ? initials(activeContact.name) : <UserRound className="h-5 w-5" />}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold">{activeContact?.name ?? "گفتگو"}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{activeContact?.role ?? ""}</p>
          </div>

          <button
            type="button"
            onClick={() => void loadMessages(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="به‌روزرسانی گفتگو"
            title="به‌روزرسانی"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </header>

        <div
          ref={messageListRef}
          onScroll={(event) => {
            const element = event.currentTarget
            shouldStickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100
          }}
          className="flex-1 space-y-4 overflow-y-auto bg-background/50 px-3 py-4 sm:px-5"
        >
          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadOlderMessages()}
                disabled={isLoadingOlder}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
              >
                {isLoadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                پیام‌های قدیمی‌تر
              </button>
            </div>
          )}

          {isLoading && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              در حال دریافت پیام‌ها...
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <MessageCircle className="h-7 w-7" />
              </span>
              <p className="font-bold">هنوز پیامی رد و بدل نشده است</p>
              <p className="mt-1 text-sm text-muted-foreground">اولین پیام این گفتگو را ارسال کنید.</p>
            </div>
          )}

          {messages.map((message, index) => {
            const isMe = message.senderId === currentUserId
            const previous = messages[index - 1]
            const showDate = !previous || !sameDay(previous.createdAt, message.createdAt)

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="my-4 flex justify-center">
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground shadow-sm">
                      {formatDay(message.createdAt)}
                    </span>
                  </div>
                )}

                <div className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                  <article className={`max-w-[88%] break-words rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${isMe ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border bg-card text-foreground"}`}>
                    <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                    <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {isMe && (message.readAt ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
                    </div>
                  </article>
                </div>
              </div>
            )
          })}

          {error && (
            <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center text-xs text-red-600">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="border-t border-border bg-card p-3 sm:p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              onKeyDown={handleComposerKeyDown}
              placeholder="پیام خود را بنویسید..."
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              disabled={isSending || !activeReceiverId}
              className="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim() || !activeReceiverId}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="ارسال پیام"
              title="ارسال پیام"
            >
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
            <span>Enter برای ارسال · Shift + Enter برای خط جدید</span>
            <span>{input.length}/{MAX_MESSAGE_LENGTH}</span>
          </div>
        </form>
      </div>

      {!showContacts && messages.length > 0 && (
        <button
          type="button"
          onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="absolute bottom-28 left-6 hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg hover:bg-muted lg:flex"
          aria-label="رفتن به آخرین پیام"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </section>
  )
}
