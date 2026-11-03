export interface RuleLike {
  field: string
  operator: string
  value?: string | null
  logicGroup: string
}

function getPath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, data)
}

export function evaluateRule(rule: RuleLike, data: Record<string, unknown>): boolean {
  const actual = getPath(data, rule.field)
  switch (rule.operator) {
    case "EQUALS":
      return String(actual) === String(rule.value)
    case "NOT_EQUALS":
      return String(actual) !== String(rule.value)
    case "GREATER_THAN":
      return Number(actual) > Number(rule.value)
    case "LESS_THAN":
      return Number(actual) < Number(rule.value)
    case "CONTAINS":
      return typeof actual === "string" && actual.includes(String(rule.value))
    case "IS_EMPTY":
      return actual === undefined || actual === null || actual === ""
    case "IS_NOT_EMPTY":
      return actual !== undefined && actual !== null && actual !== ""
    default:
      return false
  }
}

export interface RuleEvaluationDetail {
  field: string
  operator: string
  value?: string | null
  passed: boolean
  referenced: boolean
}

export function evaluateRuleSet(rules: RuleLike[], data: Record<string, unknown>) {
  let satisfied: boolean | null = null
  const details: RuleEvaluationDetail[] = []

  for (const rule of rules) {
    const passed = evaluateRule(rule, data)
    const referenced = getPath(data, rule.field) !== undefined
    details.push({ field: rule.field, operator: rule.operator, value: rule.value, passed, referenced })

    if (satisfied === null) {
      satisfied = passed
    } else if (rule.logicGroup === "OR") {
      satisfied = satisfied || passed
    } else {
      satisfied = satisfied && passed
    }
  }

  return { satisfied: satisfied ?? true, details }
}

/**
 * Scenario-level expected decisions use domain vocabulary (ACTIVATE, PROCEED, REJECT, NO_OP).
 * REJECT and NO_OP both expect the business rule set to withhold the action (either the
 * action is invalid, or it has already happened and must not repeat).
 */
export function expectedRulesSatisfied(expectedDecision: string): boolean {
  return expectedDecision !== "REJECT" && expectedDecision !== "NO_OP"
}
