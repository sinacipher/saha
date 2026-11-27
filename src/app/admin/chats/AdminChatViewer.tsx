"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react"

const PAGE_SIZE = 40
const LIST_REFRESH_MS = 10000
const MESSAGE_REFRESH_MS = 5000

type Participant = {
  id: string
  fullName: string | null
  role: "ADMIN" | "COUNSELOR" | "STUDENT" | "PARENT"
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
  senderRole: Participant["role"]
  content: string
  createdAt: string
  readAt: string | null
}

type SelectedChat = {
  id: string
  participants: Participant[]
  messages: ChatMessage[]
}

const roleNames: Record<Participant["role"], string> = {
  ADMIN: "مدیر",
  COUNSELOR: "مشاور",
  STUDENT: "دانش‌آموز",
  PARENT: "والدین",
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("") || "؟"
}

export default function AdminChatViewer() {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selectedChatId, setSelectedChatId] = useState("")
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null)
  const [search, setSearch] = useState("")
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState("")
  const [showConversation, setShowConversation] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const shouldStickToBottomRef = useRef(true)

  const loadChat = useCallback(async (chatId: string, silent = false) => {
    if (!chatId) return
    if (!silent) setLoadingMessages(true)

    try {
      const response = await fetch(
        `/api/admin/chats?chatId=${encodeURIComponent(chatId)}`,
        { cache: "no-store" }
      )
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "دریافت گفتگو ناموفق بود.")
      }

      setSelectedChat(data.chat as SelectedChat)
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای دریافت گفتگو")
    } finally {
      if (!silent) setLoadingMessages(false)
    }
  }, [])

  const loadChats = useCallback(async (targetPage: number, silent = false) => {
    if (!silent) setLoadingList(true)

    try {
      const response = await fetch(
        `/api/admin/chats?page=${targetPage}&limit=${PAGE_SIZE}`,
        { cache: "no-store" }
      )
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || "دریافت فهرست گفتگوها ناموفق بود.")
      }

      const nextChats = Array.isArray(data?.chats) ? data.chats as ChatSummary[] : []
      setChats(nextChats)
      setTotal(Number(data?.total ?? 0))

      if (!selectedChatId && nextChats[0]) {
        setSelectedChatId(nextChats[0].id)
        setShowConversation(false)
        await loadChat(nextChats[0].id, true)
      } else if (selectedChatId && !nextChats.some((chat) => chat.id === selectedChatId)) {
        setSelectedChatId(nextChats[0]?.id ?? "")
        if (nextChats[0]) await loadChat(nextChats[0].id, true)
        else setSelectedChat(null)
      }
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطای دریافت فهرست گفتگوها")
    } finally {
      if (!silent) setLoadingList(false)
    }
  }, [loadChat, selectedChatId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadChats(page)
    }, 0)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadChats(page, true)
    }, LIST_REFRESH_MS)

    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [loadChats, page])

  useEffect(() => {
    if (!selectedChatId) return

    const timer = window.setTimeout(() => {
      void loadChat(selectedChatId, true)
    }, 0)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadChat(selectedChatId, true)
    }, MESSAGE_REFRESH_MS)

    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [loadChat, selectedChatId])

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [selectedChat?.messages])

  const visibleChats = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return chats

    return chats.filter((chat) => {
      const values = [
        chat.counselor?.fullName ?? "",
        chat.student?.fullName ?? "",
        chat.parent?.fullName ?? "",
        chat.lastMessage?.content ?? "",
      ]
      return values.some((value) => value.toLocaleLowerCase().includes(query))
    })
  }, [chats, search])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const selectedSummary = chats.find((chat) => chat.id === selectedChatId)
  const receiver = selectedSummary?.student ?? selectedSummary?.parent ?? null

  return (
    <section className="flex h-[min(780px,calc(100dvh-12rem))] min-h-[500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <aside className={`${showConversation ? "hidden" : "flex"} w-full shrink-0 flex-col bg-muted/20 md:flex md:w-[330px] md:border-l md:border-border`}>
        <header className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">همه گفتگوها</h2>
              <p className="mt-1 text-xs text-muted-foreground">مشاهده فقط · {total} گفتگو</p>
            </div>
            <button
              type="button"
              onClick={() => void loadChats(page)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted"
              aria-label="به‌روزرسانی فهرست"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجوی نام یا متن پیام"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </header>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingList && chats.length === 0 && (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> بارگذاری گفتگوها...
            </div>
          )}

          {!loadingList && visibleChats.length === 0 && (
            <div className="p-8 text-center">
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-bold">گفتگویی پیدا نشد</p>
              <p className="mt-1 text-xs text-muted-foreground">عبارت جستجو را تغییر دهید یا بعداً دوباره بررسی کنید.</p>
            </div>
          )}

          {visibleChats.map((chat) => {
            const other = chat.student ?? chat.parent
            const active = selectedChatId === chat.id
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => {
                  setSelectedChatId(chat.id)
                  setShowConversation(true)
                  shouldStickToBottomRef.current = true
                }}
                className={`mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-right transition ${active ? "bg-primary/10" : "hover:bg-muted"}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                  {initials(other?.fullName || chat.counselor?.fullName || "گفتگو")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{other?.fullName || "مخاطب نامشخص"}</span>
                    {chat.lastMessage && <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(chat.lastMessage.createdAt)}</span>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {chat.counselor?.fullName || "مشاور"} · {chat.parent ? "والدین" : "دانش‌آموز"}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {chat.lastMessage
                      ? `${chat.lastMessage.senderName || "کاربر"}: ${chat.lastMessage.content}`
                      : "هنوز پیامی ارسال نشده است"}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {total > PAGE_SIZE && (
          <footer className="border-t border-border p-3">
            <div className="mb-2 text-center text-xs text-muted-foreground">
              صفحه {safePage} از {totalPages}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={safePage <= 1}
                className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-40"
              >
                قبلی
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={safePage >= totalPages}
                className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </footer>
        )}
      </aside>

      <div className={`${showConversation ? "flex" : "hidden"} min-w-0 flex-1 flex-col md:flex`}>
        <header className="flex items-center gap-3 border-b border-border bg-card p-4">
          <button
            type="button"
            onClick={() => setShowConversation(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-muted md:hidden"
            aria-label="بازگشت به فهرست گفتگوها"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-bold">{receiver?.fullName || "نمایش گفتگو"}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {selectedSummary?.counselor?.fullName || "مشاور"} · مشاهده فقط
            </p>
          </div>
          <button
            type="button"
            onClick={() => selectedChatId && void loadChat(selectedChatId)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
            aria-label="به‌روزرسانی پیام‌ها"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </header>

        <div
          onScroll={(event) => {
            const element = event.currentTarget
            shouldStickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100
          }}
          className="flex-1 space-y-4 overflow-y-auto bg-background/50 p-4 sm:p-6"
        >
          {loadingMessages && !selectedChat && (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> در حال بارگذاری پیام‌ها...
            </div>
          )}

          {!selectedChatId && !loadingMessages && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle className="mb-3 h-10 w-10" />
              <p className="font-bold">یک گفتگو را انتخاب کنید</p>
            </div>
          )}

          {selectedChat && selectedChat.messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle className="mb-3 h-10 w-10" />
              <p className="font-bold">این گفتگو هنوز پیامی ندارد</p>
            </div>
          )}

          {selectedChat?.messages.map((message) => {
            const isCounselor = message.senderRole === "COUNSELOR"
            return (
              <div key={message.id} className={`flex ${isCounselor ? "justify-start" : "justify-end"}`}>
                <article className={`max-w-[88%] break-words rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${isCounselor ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border border-border bg-card text-foreground"}`}>
                  <div className={`mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold ${isCounselor ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                    <UserRound className="h-3 w-3" />
                    {message.senderName || "کاربر"}
                    <span>· {roleNames[message.senderRole]}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                  <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${isCounselor ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <span>{formatTime(message.createdAt)}</span>
                    {message.readAt ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                  </div>
                </article>
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

        <div className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
          پنل مدیریت فقط امکان مشاهده پیام‌ها را دارد و نمی‌تواند به جای کاربران پیام ارسال کند.
        </div>
      </div>
    </section>
  )
}
