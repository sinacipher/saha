import type { HTMLAttributes } from "react"

type SkeletonVariant = "text" | "circular" | "rectangular"

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded-md",
  circular: "aspect-square rounded-full",
  rectangular: "min-h-20 w-full rounded-xl",
}

export function Skeleton({
  variant = "rectangular",
  className = "",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-muted motion-reduce:animate-none ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={`space-y-3 ${className}`}
    >
      {Array.from({ length: Math.max(0, lines) }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={index === lines - 1 ? "w-2/3" : "w-full"}
        />
      ))}
    </div>
  )
}