import { Routes, Route } from "react-router-dom"
import {
  Workflow,
  FlaskConical,
  GitCompareArrows,
  PlayCircle,
  ShieldCheck,
  CheckSquare,
  BarChart3,
  Settings,
} from "lucide-react"
import { AppShell } from "@/components/layout/AppShell"
import { Overview } from "@/pages/Overview"
import { ComingSoon } from "@/pages/ComingSoon"
import { ContractsList } from "@/pages/contracts/ContractsList"
import { ContractEditor } from "@/pages/contracts/ContractEditor"

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
        <Route
          path="/scenarios"
          element={
            <ComingSoon
              title="Scenario Intelligence"
              description="Positive, negative, boundary, and exception test cases linked to business contracts."
              icon={FlaskConical}
              phaseNote="Phase 3 of the build plan: scenario authoring, execution, and the test result matrix."
            />
          }
        />
        <Route
          path="/impact-lab"
          element={
            <ComingSoon
              title="Change Impact Lab"
              description="Compare workflow versions against the same synthetic dataset before you publish."
              icon={GitCompareArrows}
              phaseNote="Phase 3 of the build plan: baseline vs. proposed comparison and regression detection."
            />
          }
        />
        <Route
          path="/executions"
          element={
            <ComingSoon
              title="Execution Center"
              description="Monitor executions with node-level traces and separate technical vs. business status."
              icon={PlayCircle}
              phaseNote="Phase 3 of the build plan: execution list, detail timeline, and trace inspection."
            />
          }
        />
        <Route
          path="/outcomes"
          element={
            <ComingSoon
              title="Outcome Assurance"
              description="Verify that completed workflows achieved their intended business outcome."
              icon={ShieldCheck}
              phaseNote="Phase 3 of the build plan: the outcome assurance ledger and reverification flow."
            />
          }
        />
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
