import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, CircleAlert, Save } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TagListEditor } from "@/components/shared/TagListEditor"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { RuleBuilder } from "@/components/contracts/RuleBuilder"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { BusinessContract, BusinessRule, UserSummary, WorkflowSummary } from "@/types"

type DraftRule = Omit<BusinessRule, "id">

interface ContractDraft {
  name: string
  businessObjective: string
  domain: string
  ownerId: string
  workflowId: string
  trigger: string
  preconditions: string[]
  expectedOutcomes: string[]
  prohibitedOutcomes: string[]
  exceptions: string[]
  acceptanceCriteria: string[]
  kpis: string[]
  verificationMethod: string
  businessRules: DraftRule[]
}

const EMPTY_DRAFT: ContractDraft = {
  name: "",
  businessObjective: "",
  domain: "",
  ownerId: "",
  workflowId: "",
  trigger: "",
  preconditions: [],
  expectedOutcomes: [],
  prohibitedOutcomes: [],
  exceptions: [],
  acceptanceCriteria: [],
  kpis: [],
  verificationMethod: "",
  businessRules: [],
}

const REQUIRED_FIELDS: { key: keyof ContractDraft; label: string }[] = [
  { key: "name", label: "Contract name" },
  { key: "businessObjective", label: "Business objective" },
  { key: "domain", label: "Domain" },
  { key: "ownerId", label: "Business owner" },
  { key: "trigger", label: "Trigger" },
  { key: "verificationMethod", label: "Verification method" },
]

export function ContractEditor() {
  const { id } = useParams()
  const isNew = !id || id === "new"
  const navigate = useNavigate()

  const [draft, setDraft] = useState<ContractDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(isNew)
  const [currentStatus, setCurrentStatus] = useState<string>("DRAFT")

  const { data: usersData } = useFetch(() => api.get<{ users: UserSummary[] }>("/users"), [])
  const { data: workflowsData } = useFetch(() => api.get<{ workflows: WorkflowSummary[] }>("/workflows"), [])

  useEffect(() => {
    if (isNew) return
    api.get<{ contract: BusinessContract }>(`/contracts/${id}`).then(({ contract }) => {
      setDraft({
        name: contract.name,
        businessObjective: contract.businessObjective,
        domain: contract.domain,
        ownerId: contract.ownerId,
        workflowId: contract.workflowId ?? "",
        trigger: contract.trigger,
        preconditions: contract.preconditions,
        expectedOutcomes: contract.expectedOutcomes,
        prohibitedOutcomes: contract.prohibitedOutcomes,
        exceptions: contract.exceptions,
        acceptanceCriteria: contract.acceptanceCriteria,
        kpis: contract.kpis,
        verificationMethod: contract.verificationMethod,
        businessRules: contract.businessRules.map((r) => ({ ...r })),
      })
      setCurrentStatus(contract.status)
      setLoaded(true)
    })
  }, [id, isNew])

  const missingFields = useMemo(
    () => REQUIRED_FIELDS.filter((f) => !String(draft[f.key] ?? "").trim()),
    [draft]
  )
  const isValid = missingFields.length === 0

  function patch<K extends keyof ContractDraft>(key: K, value: ContractDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = { ...draft, workflowId: draft.workflowId || undefined }
      if (isNew) {
        const { contract } = await api.post<{ contract: BusinessContract }>("/contracts", payload)
        navigate(`/contracts/${contract.id}`)
      } else {
        await api.patch(`/contracts/${id}`, payload)
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save contract")
    } finally {
      setSaving(false)
    }
  }

  async function transition(status: string) {
    if (!id || isNew) return
    setSaveError(null)
    try {
      await api.post(`/contracts/${id}/transition`, { status })
      setCurrentStatus(status)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Transition failed")
    }
  }

  const NEXT_STATUS: Record<string, string | null> = {
    DRAFT: "UNDER_REVIEW",
    UNDER_REVIEW: "APPROVED",
    APPROVED: "ACTIVE",
    ACTIVE: "ARCHIVED",
    ARCHIVED: null,
  }
  const NEXT_LABEL: Record<string, string> = {
    UNDER_REVIEW: "Submit for Review",
    APPROVED: "Approve",
    ACTIVE: "Activate",
    ARCHIVED: "Archive",
  }

  if (!loaded) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contracts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted">Back to Business Contracts</span>
      </div>

      <PageHeader
        title={isNew ? "New Business Contract" : draft.name || "Edit Contract"}
        description="Capture the business objective, rules, and acceptance criteria before any workflow is built."
        actions={
          <div className="flex items-center gap-2">
            {!isNew && <StatusBadge status={currentStatus} />}
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      {saveError && <InlineBanner className="mb-4">{saveError}</InlineBanner>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-5">
          <Section title="1. Business Objective">
            <Field label="Contract Name">
              <Input value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="e.g. Subscription Activation Contract" />
            </Field>
            <Field label="Business Objective">
              <Textarea
                value={draft.businessObjective}
                onChange={(e) => patch("businessObjective", e.target.value)}
                placeholder="What business outcome must this automation guarantee?"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Domain">
                <Input value={draft.domain} onChange={(e) => patch("domain", e.target.value)} placeholder="e.g. SaaS Subscriptions" />
              </Field>
              <Field label="Business Owner">
                <Select value={draft.ownerId} onValueChange={(v) => patch("ownerId", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {(usersData?.users ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Linked Workflow (optional)">
              <Select value={draft.workflowId || "__none"} onValueChange={(v) => patch("workflowId", v === "__none" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No workflow linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unlinked</SelectItem>
                  {(workflowsData?.workflows ?? []).map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          <Section title="2. Trigger and Preconditions">
            <Field label="Trigger">
              <Input value={draft.trigger} onChange={(e) => patch("trigger", e.target.value)} placeholder="e.g. payment.completed webhook" />
            </Field>
            <Field label="Preconditions">
              <TagListEditor items={draft.preconditions} onChange={(v) => patch("preconditions", v)} placeholder="Add a precondition..." />
            </Field>
          </Section>

          <Section title="3. Business Rules">
            <RuleBuilder rules={draft.businessRules} onChange={(v) => patch("businessRules", v)} />
          </Section>

          <Section title="4. Expected Outcomes">
            <TagListEditor items={draft.expectedOutcomes} onChange={(v) => patch("expectedOutcomes", v)} placeholder="Add an expected outcome..." />
          </Section>

          <Section title="5. Prohibited Outcomes">
            <TagListEditor items={draft.prohibitedOutcomes} onChange={(v) => patch("prohibitedOutcomes", v)} placeholder="Add a prohibited outcome..." />
          </Section>

          <Section title="6. Exceptions">
            <TagListEditor items={draft.exceptions} onChange={(v) => patch("exceptions", v)} placeholder="Add an exception..." />
          </Section>

          <Section title="7. Acceptance Criteria">
            <TagListEditor items={draft.acceptanceCriteria} onChange={(v) => patch("acceptanceCriteria", v)} placeholder="Given/When/Then..." />
          </Section>

          <Section title="8. KPIs and Verification Strategy">
            <Field label="KPIs">
              <TagListEditor items={draft.kpis} onChange={(v) => patch("kpis", v)} placeholder="Add a KPI..." />
            </Field>
            <Field label="Verification Method">
              <Textarea
                value={draft.verificationMethod}
                onChange={(e) => patch("verificationMethod", e.target.value)}
                placeholder="How will the destination state be checked after execution?"
              />
            </Field>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Validation</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {isValid ? (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> All required fields complete
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <CircleAlert className="h-4 w-4" /> Missing required information
                  </div>
                  <ul className="list-inside list-disc text-xs text-muted">
                    {missingFields.map((f) => (
                      <li key={f.key}>{f.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-xs text-muted">
              <SummaryRow label="Business Rules" value={String(draft.businessRules.length)} />
              <SummaryRow label="Expected Outcomes" value={String(draft.expectedOutcomes.length)} />
              <SummaryRow label="Prohibited Outcomes" value={String(draft.prohibitedOutcomes.length)} />
              <SummaryRow label="Acceptance Criteria" value={String(draft.acceptanceCriteria.length)} />
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-muted">Current status</p>
                <StatusBadge status={currentStatus} />
                {NEXT_STATUS[currentStatus] && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => transition(NEXT_STATUS[currentStatus]!)}
                    disabled={!isValid}
                  >
                    {NEXT_LABEL[NEXT_STATUS[currentStatus]!]}
                  </Button>
                )}
                {!isValid && <p className="text-[11px] text-muted">Complete required fields before advancing status.</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-medium text-[var(--text)]">{value}</span>
    </div>
  )
}
