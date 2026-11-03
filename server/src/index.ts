import express from "express"
import cors from "cors"
import { dashboardRouter } from "./routes/dashboard.js"
import { contractsRouter } from "./routes/contracts.js"
import { usersRouter } from "./routes/users.js"
import { workflowsRouter, workflowTemplatesRouter } from "./routes/workflows.js"
import { scenariosRouter } from "./routes/scenarios.js"
import { outcomesRouter } from "./routes/outcomes.js"
import { executionsRouter } from "./routes/executions.js"
import { simulationsRouter } from "./routes/simulations.js"

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

app.use(cors())
app.use(express.json())

app.get("/api/health", (_req, res) => res.json({ status: "ok" }))
app.use("/api/dashboard", dashboardRouter)
app.use("/api/contracts", contractsRouter)
app.use("/api/users", usersRouter)
app.use("/api/workflows", workflowsRouter)
app.use("/api/workflow-templates", workflowTemplatesRouter)
app.use("/api/scenarios", scenariosRouter)
app.use("/api/outcomes", outcomesRouter)
app.use("/api/executions", executionsRouter)
app.use("/api/simulations", simulationsRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ message: "Internal server error" })
})

app.listen(PORT, () => {
  console.log(`FlowPact API listening on http://localhost:${PORT}`)
})
