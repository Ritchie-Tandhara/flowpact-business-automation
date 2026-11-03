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

export interface UserSummary {
  id: string
  name: string
  email: string
  role: string
}

export interface WorkflowSummary {
  id: string
  name: string
  domain: string
  status: string
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

export type TestType = "POSITIVE" | "NEGATIVE" | "BOUNDARY" | "EXCEPTION" | "REGRESSION"

export interface RuleEvaluationDetail {
  field: string
  operator: string
  value?: string | null
  passed: boolean
  referenced: boolean
}

export interface TestRunResult {
  id: string
  status: "PASSED" | "FAILED" | "BLOCKED" | "NOT_RUN"
  actualDecision: string | null
  actualOutcome: string | null
  executionTrace: RuleEvaluationDetail[]
  createdAt: string
}

export interface TestScenario {
  id: string
  contractId: string
  workflowId?: string | null
  testType: TestType
  description: string
  inputData: Record<string, unknown>
  preconditions: string[]
  expectedDecision: string
  expectedOutcome: string
  prohibitedActions: string[]
  createdAt: string
  latestResult: TestRunResult | null
}

export interface NodeExecutionTrace {
  id: string
  nodeId: string
  nodeType: string
  nodeName: string
  status: "SUCCESS" | "FAILED" | "SKIPPED"
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  errorMessage: string | null
  order: number
}

export interface ExecutionRecord {
  id: string
  workflowId: string
  workflow?: { id: string; name: string; domain: string }
  workflowVersionId: string
  workflowVersion?: { id: string; versionNum: number }
  trigger: string
  startedAt: string
  completedAt: string | null
  technicalStatus: "SUCCESS" | "FAILED" | "ERROR"
  businessOutcomeStatus: "VERIFIED" | "MISMATCH" | "PENDING" | "UNABLE_TO_VERIFY"
  errorCategory: string | null
  inputSnapshot: Record<string, unknown>
  outputSnapshot: Record<string, unknown> | null
  nodeTraces?: NodeExecutionTrace[]
  outcomeVerifications?: OutcomeVerification[]
}

export interface ChangeSimulationResultRow {
  scenario: string
  baselineDecision: string
  proposedDecision: string
  change: "UNCHANGED" | "IMPROVED" | "REGRESSED"
}

export interface ChangeSimulation {
  id: string
  workflowId: string
  workflow?: { id: string; name: string; domain: string } | null
  baselineVersion: { id: string; versionNum: number }
  proposedVersion: { id: string; versionNum: number }
  totalScenarios: number
  unchangedCount: number
  improvedCount: number
  regressedCount: number
  newlyViolatedCount: number
  resultDetail: ChangeSimulationResultRow[]
  createdAt: string
}

export interface OutcomeVerification {
  id: string
  executionId: string
  contractId: string
  contract?: { id: string; name: string; domain: string }
  execution?: { id: string; workflowId: string; startedAt: string; technicalStatus: string }
  expectedState: Record<string, unknown>
  observedState: Record<string, unknown>
  status: "VERIFIED" | "MISMATCH" | "PENDING_VERIFICATION" | "UNABLE_TO_VERIFY"
  mismatchReason: string | null
  evidence: Record<string, unknown> | null
  resolutionStatus: "OPEN" | "RESOLVED" | "ACCEPTED_RISK"
  ownerId: string | null
  verifiedAt: string
}
