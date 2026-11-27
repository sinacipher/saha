import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel = "بازگشت",
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      dir="rtl"
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0 space-y-2">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            {backLabel}
          </Link>
        )}

        {eyebrow && (
          <p className="text-xs font-semibold tracking-wide text-primary">
            {eyebrow}
          </p>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}