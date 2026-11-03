export interface DashboardKpis {
  totalAutomations: number
  activeAutomations: number
  executions: number
  technicalSuccessRate: number
  verifiedBusinessOutcomeRate: number
  failedBusinessContracts: number
  scenariosPassed: number
  scenariosTotal: number
  pendingApprovals: number
  automationsAtRisk: number
  totalContracts: number
}

export interface BusinessRule {
  id: string
  field: string
  operator: string
  value?: string | null
  logicGroup: string
  order: number
}

export interface BusinessContract {
  id: string
  name: string
  businessObjective: string
  domain: string
  ownerId: string
  owner?: { id: string; name: string }
  workflowId?: string | null
  workflow?: { id: string; name: string } | null
  trigger: string
  preconditions: string[]
  expectedOutcomes: string[]
  prohibitedOutcomes: string[]
  exceptions: string[]
  acceptanceCriteria: string[]
  kpis: string[]
  verificationMethod: string
  version: number
  status: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "ACTIVE" | "ARCHIVED"
  businessRules: BusinessRule[]
  createdAt: string
  updatedAt: string
}
