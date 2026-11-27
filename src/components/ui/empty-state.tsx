import { Inbox } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      dir="rtl"
      role="status"
      className={`flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden="true" />}
      </div>

      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}