"use client"

import { Menu } from "lucide-react"
import { Button } from "./button"
import type { ReactNode } from "react"

interface MobileTopBarProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
  actions?: ReactNode
  className?: string
}

export function MobileTopBar({
  title,
  subtitle,
  onMenuClick,
  actions,
  className = "",
}: MobileTopBarProps) {
  return (
    <header
      dir="rtl"
      className={`sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-sm md:hidden ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 shrink-0 p-0"
          aria-label="باز کردن منو"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-foreground">
            {title}
          </h1>

          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}