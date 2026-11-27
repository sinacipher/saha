"use client"

import { useEffect, useId, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "./button"
import type { ReactNode } from "react"

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  side?: "right" | "left"
  className?: string
}

export function Drawer({
  open,
  onClose,
  title = "منو",
  children,
  side = "right",
  className = "",
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
        return
      }

      if (event.key !== "Tab") return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )

      if (!focusable?.length) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open, onClose])

  const positionClass = side === "right" ? "right-0" : "left-0"
  const closedTransform =
    side === "right" ? "translate-x-full" : "-translate-x-full"

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="بستن منو"
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 motion-reduce:transition-none ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        dir="rtl"
        className={`fixed inset-y-0 ${positionClass} z-[70] flex w-[min(88vw,24rem)] flex-col bg-card shadow-modal transition-transform duration-200 ease-out motion-reduce:transition-none ${
          open ? "translate-x-0" : closedTransform
        } ${className}`}
      >
        <div className="flex min-h-16 items-center justify-between border-b border-border px-5">
          <h2 id={titleId} className="text-base font-bold text-foreground">
            {title}
          </h2>

          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="sm"
            aria-label="بستن منو"
            className="h-10 w-10 p-0"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  )
}