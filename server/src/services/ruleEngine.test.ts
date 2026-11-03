import { describe, it, expect } from "vitest"
import { evaluateRule, evaluateRuleSet, expectedRulesSatisfied, type RuleLike } from "./ruleEngine.js"

describe("evaluateRule", () => {
  const data = { payment: { status: "SUCCESS", customerId: "cust_1", amount: 0 }, note: "" }

  it("EQUALS matches string values", () => {
    expect(evaluateRule({ field: "payment.status", operator: "EQUALS", value: "SUCCESS", logicGroup: "AND" }, data)).toBe(true)
    expect(evaluateRule({ field: "payment.status", operator: "EQUALS", value: "FAILED", logicGroup: "AND" }, data)).toBe(false)
  })

  it("NOT_EQUALS inverts EQUALS", () => {
    expect(evaluateRule({ field: "payment.status", operator: "NOT_EQUALS", value: "FAILED", logicGroup: "AND" }, data)).toBe(true)
  })

  it("GREATER_THAN and LESS_THAN compare numerically", () => {
    expect(evaluateRule({ field: "payment.amount", operator: "GREATER_THAN", value: "-1", logicGroup: "AND" }, data)).toBe(true)
    expect(evaluateRule({ field: "payment.amount", operator: "LESS_THAN", value: "1", logicGroup: "AND" }, data)).toBe(true)
  })

  it("CONTAINS checks substring on string fields", () => {
    expect(evaluateRule({ field: "payment.customerId", operator: "CONTAINS", value: "cust", logicGroup: "AND" }, data)).toBe(true)
    expect(evaluateRule({ field: "payment.customerId", operator: "CONTAINS", value: "zzz", logicGroup: "AND" }, data)).toBe(false)
  })

  it("IS_EMPTY and IS_NOT_EMPTY treat empty string and missing paths as empty", () => {
    expect(evaluateRule({ field: "note", operator: "IS_EMPTY", logicGroup: "AND" }, data)).toBe(true)
    expect(evaluateRule({ field: "missing.path", operator: "IS_EMPTY", logicGroup: "AND" }, data)).toBe(true)
    expect(evaluateRule({ field: "payment.customerId", operator: "IS_NOT_EMPTY", logicGroup: "AND" }, data)).toBe(true)
  })

  it("resolves nested dot paths", () => {
    expect(evaluateRule({ field: "payment.status", operator: "EQUALS", value: "SUCCESS", logicGroup: "AND" }, data)).toBe(true)
  })
})

describe("evaluateRuleSet", () => {
  it("ANDs rules together by default", () => {
    const rules: RuleLike[] = [
      { field: "a", operator: "EQUALS", value: "1", logicGroup: "AND" },
      { field: "b", operator: "EQUALS", value: "2", logicGroup: "AND" },
    ]
    expect(evaluateRuleSet(rules, { a: "1", b: "2" }).satisfied).toBe(true)
    expect(evaluateRuleSet(rules, { a: "1", b: "x" }).satisfied).toBe(false)
  })

  it("ORs when a rule specifies logicGroup OR", () => {
    const rules: RuleLike[] = [
      { field: "a", operator: "EQUALS", value: "1", logicGroup: "AND" },
      { field: "b", operator: "EQUALS", value: "2", logicGroup: "OR" },
    ]
    // a fails, but b satisfies the OR branch
    expect(evaluateRuleSet(rules, { a: "x", b: "2" }).satisfied).toBe(true)
    expect(evaluateRuleSet(rules, { a: "x", b: "y" }).satisfied).toBe(false)
  })

  it("marks a field referenced only when present in the input, independent of pass/fail", () => {
    const rules: RuleLike[] = [{ field: "missing.field", operator: "EQUALS", value: "1", logicGroup: "AND" }]
    const { details } = evaluateRuleSet(rules, {})
    expect(details[0].referenced).toBe(false)
    expect(details[0].passed).toBe(false)
  })

  it("an empty rule set is vacuously satisfied", () => {
    expect(evaluateRuleSet([], {}).satisfied).toBe(true)
  })
})

describe("expectedRulesSatisfied", () => {
  it("REJECT and NO_OP expect the rule set to withhold the action", () => {
    expect(expectedRulesSatisfied("REJECT")).toBe(false)
    expect(expectedRulesSatisfied("NO_OP")).toBe(false)
  })

  it("ACTIVATE and PROCEED expect the rule set to permit the action", () => {
    expect(expectedRulesSatisfied("ACTIVATE")).toBe(true)
    expect(expectedRulesSatisfied("PROCEED")).toBe(true)
  })
})
