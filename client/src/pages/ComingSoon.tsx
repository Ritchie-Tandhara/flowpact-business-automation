import type { LucideIcon } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"

interface ComingSoonProps {
  title: string
  description: string
  icon: LucideIcon
  phaseNote: string
}

export function ComingSoon({ title, description, icon, phaseNote }: ComingSoonProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title="Module under active build" description={phaseNote} />
    </div>
  )
}
