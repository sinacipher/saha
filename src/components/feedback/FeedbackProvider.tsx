"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react"

type ToastVariant = "success" | "error" | "warning" | "info"

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastItem = ToastInput & {
  id: number
  variant: ToastVariant
}

type ConfirmInput = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type FeedbackContextType = {
  notify: (input: ToastInput) => void
  confirmAction: (input: ConfirmInput) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackContextType | null>(null)

const toastStyles: Record<ToastVariant, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return <CheckCircle2 className="h-5 w-5 shrink-0" />
  }

  if (variant === "error") {
    return <XCircle className="h-5 w-5 shrink-0" />
  }

  if (variant === "warning") {
    return <AlertTriangle className="h-5 w-5 shrink-0" />
  }

  return <Info className="h-5 w-5 shrink-0" />
}

export function FeedbackProvider({
  children,
}: {
  children: ReactNode
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmation, setConfirmation] = useState<ConfirmInput | null>(null)

  const nextId = useRef(1)
  const confirmationResolver = useRef<
    ((accepted: boolean) => void) | null
  >(null)

  const notify = useCallback((input: ToastInput) => {
    const id = nextId.current++

    const toast: ToastItem = {
      ...input,
      id,
      variant: input.variant ?? "info",
    }

    setToasts((current) => [...current, toast].slice(-4))

    window.setTimeout(() => {
      setToasts((current) =>
        current.filter((item) => item.id !== id)
      )
    }, input.duration ?? 4000)
  }, [])

  const finishConfirmation = useCallback((accepted: boolean) => {
    confirmationResolver.current?.(accepted)
    confirmationResolver.current = null
    setConfirmation(null)
  }, [])

  const confirmAction = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      confirmationResolver.current?.(false)
      confirmationResolver.current = resolve
      setConfirmation(input)
    })
  }, [])

  const dismissToast = (id: number) => {
    setToasts((current) =>
      current.filter((item) => item.id !== id)
    )
  }

  useEffect(() => {
    if (!confirmation) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        finishConfirmation(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [confirmation, finishConfirmation])

  return (
    <FeedbackContext.Provider value={{ notify, confirmAction }}>
      {children}

      <div
        className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-xl ${toastStyles[toast.variant]}`}
          >
            <ToastIcon variant={toast.variant} />

            <div className="min-w-0 flex-1">
              <p className="font-bold">{toast.title}</p>

              {toast.description && (
                <p className="mt-1 text-sm leading-6 opacity-90">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="بستن اعلان"
              className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {confirmation && (
        <div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => finishConfirmation(false)}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="feedback-dialog-title"
            aria-describedby="feedback-dialog-description"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div
              className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                confirmation.danger
                  ? "bg-red-500/10 text-red-600"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {confirmation.danger ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <Info className="h-6 w-6" />
              )}
            </div>

            <h2
              id="feedback-dialog-title"
              className="text-xl font-bold"
            >
              {confirmation.title}
            </h2>

            <p
              id="feedback-dialog-description"
              className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground"
            >
              {confirmation.description}
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => finishConfirmation(false)}
                className="rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:bg-muted"
              >
                {confirmation.cancelLabel ?? "انصراف"}
              </button>

              <button
                type="button"
                autoFocus
                onClick={() => finishConfirmation(true)}
                className={`rounded-xl px-5 py-3 text-sm font-bold text-white transition ${
                  confirmation.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:opacity-90"
                }`}
              >
                {confirmation.confirmLabel ?? "تأیید"}
              </button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)

  if (!context) {
    throw new Error(
      "useFeedback must be used inside FeedbackProvider"
    )
  }

  return context
}