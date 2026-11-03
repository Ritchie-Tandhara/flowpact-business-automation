import * as React from "react"
import { cn } from "@/lib/utils"

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm text-[var(--text)] placeholder:text-muted focus-ring",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
