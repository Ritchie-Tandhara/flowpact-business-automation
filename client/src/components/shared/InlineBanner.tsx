import { cn } from "@/lib/utils"

const VARIANTS = {
  error: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
}

export function InlineBanner({
  variant = "error",
  className,
  children,
}: {
  variant?: "error" | "warning"
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-md border px-3 py-2 text-sm", VARIANTS[variant], className)}>{children}</div>
  )
}
