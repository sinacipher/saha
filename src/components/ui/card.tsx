import { forwardRef, type HTMLAttributes } from "react"

type CardVariant = "default" | "elevated" | "sunken" | "interactive"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-card border border-border rounded-xl shadow-card",
  elevated: "bg-card rounded-xl shadow-card-hover",
  sunken: "bg-surface-sunken border border-border rounded-xl",
  interactive:
    "bg-card border border-border rounded-xl shadow-card cursor-pointer " +
    "hover:shadow-card-hover hover:-translate-y-0.5 " +
    "transition-[box-shadow,transform] duration-200 ease-out " +
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const classes = [variantClasses[variant], className].filter(Boolean).join(" ")
    return <div ref={ref} className={classes} {...props} />
  }
)
Card.displayName = "Card"

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const classes = ["p-6 pb-3", className].filter(Boolean).join(" ")
    return <div ref={ref} className={classes} {...props} />
  }
)
CardHeader.displayName = "CardHeader"

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const classes = ["text-lg font-semibold text-foreground", className].filter(Boolean).join(" ")
    return <h3 ref={ref} className={classes} {...props} />
  }
)
CardTitle.displayName = "CardTitle"

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const classes = ["p-6 pt-0", className].filter(Boolean).join(" ")
    return <div ref={ref} className={classes} {...props} />
  }
)
CardContent.displayName = "CardContent"