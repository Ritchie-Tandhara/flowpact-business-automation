import { Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/AppShell"
import { Overview } from "@/pages/Overview"
import { ContractsList } from "@/pages/contracts/ContractsList"
import { ContractEditor } from "@/pages/contracts/ContractEditor"
import { ScenarioIntelligence } from "@/pages/ScenarioIntelligence"
import { OutcomeAssurance } from "@/pages/OutcomeAssurance"
import { ExecutionCenter } from "@/pages/ExecutionCenter"
import { ChangeImpactLab } from "@/pages/ChangeImpactLab"
import { WorkflowStudio } from "@/pages/WorkflowStudio"
import { Approvals } from "@/pages/Approvals"
import { Analytics } from "@/pages/Analytics"
import { Settings } from "@/pages/Settings"

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/contracts" element={<ContractsList />} />
        <Route path="/contracts/new" element={<ContractEditor />} />
        <Route path="/contracts/:id" element={<ContractEditor />} />
        <Route path="/studio" element={<WorkflowStudio />} />
        <Route path="/scenarios" element={<ScenarioIntelligence />} />
        <Route path="/impact-lab" element={<ChangeImpactLab />} />
        <Route path="/executions" element={<ExecutionCenter />} />
        <Route path="/outcomes" element={<OutcomeAssurance />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
