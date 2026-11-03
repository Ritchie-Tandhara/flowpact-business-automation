import { Routes, Route } from "react-router-dom"
import {
  Workflow,
  CheckSquare,
  BarChart3,
  Settings,
} from "lucide-react"
import { AppShell } from "@/components/layout/AppShell"
import { Overview } from "@/pages/Overview"
import { ComingSoon } from "@/pages/ComingSoon"
import { ContractsList } from "@/pages/contracts/ContractsList"
import { ContractEditor } from "@/pages/contracts/ContractEditor"
import { ScenarioIntelligence } from "@/pages/ScenarioIntelligence"
import { OutcomeAssurance } from "@/pages/OutcomeAssurance"
import { ExecutionCenter } from "@/pages/ExecutionCenter"
import { ChangeImpactLab } from "@/pages/ChangeImpactLab"

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/contracts" element={<ContractsList />} />
        <Route path="/contracts/new" element={<ContractEditor />} />
        <Route path="/contracts/:id" element={<ContractEditor />} />
        <Route
          path="/studio"
          element={
            <ComingSoon
              title="Workflow Studio"
              description="Visual automation builder with a deterministic execution engine."
              icon={Workflow}
              phaseNote="Phase 4 of the build plan: React Flow canvas, node configuration, and workflow interpreter."
            />
          }
        />
        <Route path="/scenarios" element={<ScenarioIntelligence />} />
        <Route path="/impact-lab" element={<ChangeImpactLab />} />
        <Route path="/executions" element={<ExecutionCenter />} />
        <Route path="/outcomes" element={<OutcomeAssurance />} />
        <Route
          path="/approvals"
          element={
            <ComingSoon
              title="Approvals"
              description="Lightweight release governance gated on acceptance criteria and simulation results."
              icon={CheckSquare}
              phaseNote="Phase 5 of the build plan: approval lifecycle and authorized exception handling."
            />
          }
        />
        <Route
          path="/analytics"
          element={
            <ComingSoon
              title="Analytics"
              description="Deeper drill-down analytics across contracts, workflows, and outcomes."
              icon={BarChart3}
              phaseNote="Phase 5 of the build plan."
            />
          }
        />
        <Route
          path="/settings"
          element={
            <ComingSoon
              title="Settings"
              description="Workspace and persona configuration."
              icon={Settings}
              phaseNote="Phase 5 of the build plan."
            />
          }
        />
      </Route>
    </Routes>
  )
}

export default App
