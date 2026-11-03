import { Badge } from "@/components/ui/badge"

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "indigo" | "outline"> = {
  DRAFT: "default",
  UNDER_REVIEW: "warning",
  APPROVED: "indigo",
  ACTIVE: "success",
  ARCHIVED: "outline",
  PUBLISHED: "success",
  SUBMITTED: "warning",
  REJECTED: "error",
  PASSED: "success",
  FAILED: "error",
  BLOCKED: "warning",
  NOT_RUN: "outline",
  VERIFIED: "success",
  MISMATCH: "error",
  PENDING_VERIFICATION: "warning",
  UNABLE_TO_VERIFY: "outline",
}

const STATUS_LABELS: Record<string, string> = {
  UNDER_REVIEW: "Under Review",
  NOT_RUN: "Not Run",
  PENDING_VERIFICATION: "Pending Verification",
  UNABLE_TO_VERIFY: "Unable to Verify",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "default"}>
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </Badge>
  )
}
