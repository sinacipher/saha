import { forwardRef, useId, type InputHTMLAttributes } from "react"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const reactId = useId()
    const inputId = id ?? props.name ?? reactId

    const inputClasses = [
      "w-full px-3.5 py-2.5 rounded-lg",
      "bg-card text-foreground placeholder:text-muted-foreground",
      "border transition-all duration-150",
      "focus:outline-none focus:ring-2 focus:ring-offset-1",
      "disabled:bg-surface-sunken disabled:text-muted-foreground disabled:cursor-not-allowed",
      "motion-reduce:transition-none",
      error
        ? "border-danger focus:ring-danger/30 focus:border-danger"
        : "border-border hover:border-border/80 focus:ring-primary/30 focus:border-primary",
      className,
    ]
      .filter(Boolean)
      .join(" ")

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={inputClasses} {...props} />
        {error ? (
          <p className="text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"