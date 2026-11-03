import type { WorkflowGraph } from "../services/workflowInterpreter.js"

export interface WorkflowTemplate {
  key: string
  name: string
  domain: string
  description: string
  graph: WorkflowGraph
}

/**
 * A small library of complex, multi-branch example workflows, one per major
 * industry, exercising all 7 node types. These exist so Workflow Studio has
 * realistic worked examples to start from instead of a trivial trigger->end
 * graph, and so the seeded demo data demonstrates genuine branching logic.
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: "ecommerce-refund",
    name: "Order Refund Processing",
    domain: "E-commerce",
    description: "Routes a refund request by delivery status and return window, processing eligible refunds and holding or rejecting the rest.",
    graph: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 40, y: 220 }, data: { name: "Refund Requested", config: { event: "refund.requested" } } },
        { id: "cond-delivered", type: "condition", position: { x: 300, y: 220 }, data: { name: "Order Delivered?", config: { field: "order.deliveryStatus", operator: "EQUALS", value: "DELIVERED" } } },
        { id: "cond-window", type: "condition", position: { x: 560, y: 80 }, data: { name: "Within Return Window?", config: { field: "refund.withinWindow", operator: "EQUALS", value: "true" } } },
        { id: "action-process", type: "mockApiAction", position: { x: 820, y: 80 }, data: { name: "Process Refund", config: { endpoint: "/mock/refunds/process", effect: { field: "refund.status", value: "PROCESSED" } } } },
        { id: "verify-refund", type: "verifyOutcome", position: { x: 1080, y: 80 }, data: { name: "Verify Refund Processed", config: { field: "refund.status", expected: "PROCESSED" } } },
        { id: "end-completed", type: "end", position: { x: 1340, y: 80 }, data: { name: "Refund Completed" } },
        { id: "end-window-expired", type: "end", position: { x: 820, y: 220 }, data: { name: "Rejected - Return Window Expired" } },
        { id: "cond-transit", type: "condition", position: { x: 560, y: 380 }, data: { name: "Still In Transit?", config: { field: "order.deliveryStatus", operator: "EQUALS", value: "IN_TRANSIT" } } },
        { id: "transform-hold", type: "transform", position: { x: 820, y: 380 }, data: { name: "Flag On Hold", config: { setFields: { "refund.holdReason": "Awaiting delivery confirmation" } } } },
        { id: "end-on-hold", type: "end", position: { x: 1080, y: 380 }, data: { name: "On Hold - Awaiting Delivery" } },
        { id: "end-invalid", type: "end", position: { x: 820, y: 500 }, data: { name: "Rejected - Invalid Order State" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "cond-delivered" },
        { id: "e2", source: "cond-delivered", target: "cond-window", sourceHandle: "true" },
        { id: "e3", source: "cond-delivered", target: "cond-transit", sourceHandle: "false" },
        { id: "e4", source: "cond-window", target: "action-process", sourceHandle: "true" },
        { id: "e5", source: "cond-window", target: "end-window-expired", sourceHandle: "false" },
        { id: "e6", source: "action-process", target: "verify-refund" },
        { id: "e7", source: "verify-refund", target: "end-completed" },
        { id: "e8", source: "cond-transit", target: "transform-hold", sourceHandle: "true" },
        { id: "e9", source: "transform-hold", target: "end-on-hold" },
        { id: "e10", source: "cond-transit", target: "end-invalid", sourceHandle: "false" },
      ],
    },
  },
  {
    key: "crm-lead-routing",
    name: "Lead Qualification Routing",
    domain: "CRM",
    description: "Scores and routes an inbound lead to the senior team, mid team, or nurture queue based on score and source.",
    graph: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 40, y: 220 }, data: { name: "Lead Created", config: { event: "lead.created" } } },
        { id: "cond-score", type: "condition", position: { x: 300, y: 220 }, data: { name: "Score > 70?", config: { field: "lead.score", operator: "GREATER_THAN", value: "70" } } },
        { id: "set-high", type: "setVariable", position: { x: 560, y: 80 }, data: { name: "Set Priority: High", config: { variableName: "lead.priority", value: "HIGH" } } },
        { id: "action-senior", type: "mockApiAction", position: { x: 820, y: 80 }, data: { name: "Assign Senior Rep", config: { endpoint: "/mock/leads/assign", effect: { field: "lead.owner", value: "senior_team" } } } },
        { id: "verify-senior", type: "verifyOutcome", position: { x: 1080, y: 80 }, data: { name: "Verify Senior Assignment", config: { field: "lead.owner", expected: "senior_team" } } },
        { id: "end-senior", type: "end", position: { x: 1340, y: 80 }, data: { name: "Routed - Senior Rep" } },
        { id: "cond-referral", type: "condition", position: { x: 560, y: 320 }, data: { name: "Referral Source?", config: { field: "lead.source", operator: "EQUALS", value: "referral" } } },
        { id: "set-medium", type: "setVariable", position: { x: 820, y: 220 }, data: { name: "Set Priority: Medium", config: { variableName: "lead.priority", value: "MEDIUM" } } },
        { id: "action-mid", type: "mockApiAction", position: { x: 1080, y: 220 }, data: { name: "Assign Mid Rep", config: { endpoint: "/mock/leads/assign", effect: { field: "lead.owner", value: "mid_team" } } } },
        { id: "end-mid", type: "end", position: { x: 1340, y: 220 }, data: { name: "Routed - Mid Rep" } },
        { id: "transform-low", type: "transform", position: { x: 820, y: 420 }, data: { name: "Set Priority: Low", config: { setFields: { "lead.priority": "LOW" } } } },
        { id: "end-nurture", type: "end", position: { x: 1080, y: 420 }, data: { name: "Routed - Nurture Queue" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "cond-score" },
        { id: "e2", source: "cond-score", target: "set-high", sourceHandle: "true" },
        { id: "e3", source: "set-high", target: "action-senior" },
        { id: "e4", source: "action-senior", target: "verify-senior" },
        { id: "e5", source: "verify-senior", target: "end-senior" },
        { id: "e6", source: "cond-score", target: "cond-referral", sourceHandle: "false" },
        { id: "e7", source: "cond-referral", target: "set-medium", sourceHandle: "true" },
        { id: "e8", source: "set-medium", target: "action-mid" },
        { id: "e9", source: "action-mid", target: "end-mid" },
        { id: "e10", source: "cond-referral", target: "transform-low", sourceHandle: "false" },
        { id: "e11", source: "transform-low", target: "end-nurture" },
      ],
    },
  },
  {
    key: "finance-invoice-reconciliation",
    name: "Invoice Reconciliation",
    domain: "Finance Operations",
    description: "Matches an incoming payment against an open invoice, flagging partial payments and rejecting unmatched ones.",
    graph: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 40, y: 220 }, data: { name: "Payment Received", config: { event: "payment.received" } } },
        { id: "cond-match", type: "condition", position: { x: 300, y: 220 }, data: { name: "Matches Invoice?", config: { field: "payment.matchesInvoice", operator: "EQUALS", value: "true" } } },
        { id: "action-reconcile", type: "mockApiAction", position: { x: 560, y: 80 }, data: { name: "Mark Invoice Paid", config: { endpoint: "/mock/invoices/settle", effect: { field: "invoice.status", value: "PAID" } } } },
        { id: "verify-paid", type: "verifyOutcome", position: { x: 820, y: 80 }, data: { name: "Verify Invoice Paid", config: { field: "invoice.status", expected: "PAID" } } },
        { id: "end-reconciled", type: "end", position: { x: 1080, y: 80 }, data: { name: "Reconciled" } },
        { id: "cond-partial", type: "condition", position: { x: 560, y: 320 }, data: { name: "Amount > 0?", config: { field: "payment.amount", operator: "GREATER_THAN", value: "0" } } },
        { id: "transform-partial", type: "transform", position: { x: 820, y: 320 }, data: { name: "Flag Partial", config: { setFields: { "invoice.status": "PARTIAL" } } } },
        { id: "end-partial", type: "end", position: { x: 1080, y: 320 }, data: { name: "Partial Payment Flagged" } },
        { id: "end-rejected", type: "end", position: { x: 820, y: 460 }, data: { name: "Rejected - Invalid Payment" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "cond-match" },
        { id: "e2", source: "cond-match", target: "action-reconcile", sourceHandle: "true" },
        { id: "e3", source: "action-reconcile", target: "verify-paid" },
        { id: "e4", source: "verify-paid", target: "end-reconciled" },
        { id: "e5", source: "cond-match", target: "cond-partial", sourceHandle: "false" },
        { id: "e6", source: "cond-partial", target: "transform-partial", sourceHandle: "true" },
        { id: "e7", source: "transform-partial", target: "end-partial" },
        { id: "e8", source: "cond-partial", target: "end-rejected", sourceHandle: "false" },
      ],
    },
  },
  {
    key: "support-ticket-escalation",
    name: "Support Ticket Escalation",
    domain: "Customer Support",
    description: "Escalates an SLA-breaching ticket to on-call or senior support depending on priority.",
    graph: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 40, y: 220 }, data: { name: "SLA Breached", config: { event: "ticket.slaBreached" } } },
        { id: "cond-critical", type: "condition", position: { x: 300, y: 220 }, data: { name: "Priority Critical?", config: { field: "ticket.priority", operator: "EQUALS", value: "CRITICAL" } } },
        { id: "action-page", type: "mockApiAction", position: { x: 560, y: 80 }, data: { name: "Page On-Call Engineer", config: { endpoint: "/mock/pagerduty/page", effect: { field: "ticket.assignedTeam", value: "oncall" } } } },
        { id: "verify-oncall", type: "verifyOutcome", position: { x: 820, y: 80 }, data: { name: "Verify On-Call Assigned", config: { field: "ticket.assignedTeam", expected: "oncall" } } },
        { id: "end-oncall", type: "end", position: { x: 1080, y: 80 }, data: { name: "Escalated - On-Call" } },
        { id: "cond-high", type: "condition", position: { x: 560, y: 320 }, data: { name: "Priority High?", config: { field: "ticket.priority", operator: "EQUALS", value: "HIGH" } } },
        { id: "set-senior", type: "setVariable", position: { x: 820, y: 320 }, data: { name: "Assign Senior Support", config: { variableName: "ticket.assignedTeam", value: "senior_support" } } },
        { id: "end-senior", type: "end", position: { x: 1080, y: 320 }, data: { name: "Escalated - Senior Support" } },
        { id: "transform-standard", type: "transform", position: { x: 820, y: 460 }, data: { name: "Keep Standard Queue", config: { setFields: { "ticket.assignedTeam": "standard_queue" } } } },
        { id: "end-standard", type: "end", position: { x: 1080, y: 460 }, data: { name: "No Escalation Needed" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "cond-critical" },
        { id: "e2", source: "cond-critical", target: "action-page", sourceHandle: "true" },
        { id: "e3", source: "action-page", target: "verify-oncall" },
        { id: "e4", source: "verify-oncall", target: "end-oncall" },
        { id: "e5", source: "cond-critical", target: "cond-high", sourceHandle: "false" },
        { id: "e6", source: "cond-high", target: "set-senior", sourceHandle: "true" },
        { id: "e7", source: "set-senior", target: "end-senior" },
        { id: "e8", source: "cond-high", target: "transform-standard", sourceHandle: "false" },
        { id: "e9", source: "transform-standard", target: "end-standard" },
      ],
    },
  },
  {
    key: "hr-onboarding-provisioning",
    name: "Employee Onboarding Provisioning",
    domain: "HR Operations",
    description: "Provisions accounts and equipment for a new hire differently for engineering, remote, and office staff.",
    graph: {
      nodes: [
        { id: "trigger-1", type: "trigger", position: { x: 40, y: 220 }, data: { name: "Employee Hired", config: { event: "employee.hired" } } },
        { id: "cond-eng", type: "condition", position: { x: 300, y: 220 }, data: { name: "Engineering Dept?", config: { field: "employee.department", operator: "EQUALS", value: "Engineering" } } },
        { id: "action-provision-dev", type: "mockApiAction", position: { x: 560, y: 80 }, data: { name: "Provision Dev Accounts", config: { endpoint: "/mock/accounts/provision", effect: { field: "employee.accountsProvisioned", value: "true" } } } },
        { id: "verify-dev", type: "verifyOutcome", position: { x: 820, y: 80 }, data: { name: "Verify Accounts Provisioned", config: { field: "employee.accountsProvisioned", expected: "true" } } },
        { id: "end-eng", type: "end", position: { x: 1080, y: 80 }, data: { name: "Provisioned - Engineering" } },
        { id: "cond-remote", type: "condition", position: { x: 560, y: 320 }, data: { name: "Remote Hire?", config: { field: "employee.remote", operator: "EQUALS", value: "true" } } },
        { id: "transform-remote-kit", type: "transform", position: { x: 820, y: 260 }, data: { name: "Assign Remote Kit", config: { setFields: { "employee.equipment": "remote_kit" } } } },
        { id: "action-ship", type: "mockApiAction", position: { x: 1080, y: 260 }, data: { name: "Ship Equipment", config: { endpoint: "/mock/logistics/ship", effect: { field: "employee.equipmentShipped", value: "true" } } } },
        { id: "end-remote", type: "end", position: { x: 1340, y: 260 }, data: { name: "Provisioned - Remote" } },
        { id: "set-office-kit", type: "setVariable", position: { x: 820, y: 460 }, data: { name: "Assign Office Kit", config: { variableName: "employee.equipment", value: "office_kit" } } },
        { id: "end-office", type: "end", position: { x: 1080, y: 460 }, data: { name: "Provisioned - Office" } },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "cond-eng" },
        { id: "e2", source: "cond-eng", target: "action-provision-dev", sourceHandle: "true" },
        { id: "e3", source: "action-provision-dev", target: "verify-dev" },
        { id: "e4", source: "verify-dev", target: "end-eng" },
        { id: "e5", source: "cond-eng", target: "cond-remote", sourceHandle: "false" },
        { id: "e6", source: "cond-remote", target: "transform-remote-kit", sourceHandle: "true" },
        { id: "e7", source: "transform-remote-kit", target: "action-ship" },
        { id: "e8", source: "action-ship", target: "end-remote" },
        { id: "e9", source: "cond-remote", target: "set-office-kit", sourceHandle: "false" },
        { id: "e10", source: "set-office-kit", target: "end-office" },
      ],
    },
  },
]

export function findTemplate(key: string) {
  return WORKFLOW_TEMPLATES.find((t) => t.key === key)
}
