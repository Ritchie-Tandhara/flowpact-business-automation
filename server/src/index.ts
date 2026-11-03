import express from "express"
import cors from "cors"
import { dashboardRouter } from "./routes/dashboard.js"
import { contractsRouter } from "./routes/contracts.js"
import { usersRouter } from "./routes/users.js"
import { workflowsRouter } from "./routes/workflows.js"
import { scenariosRouter } from "./routes/scenarios.js"
import { outcomesRouter } from "./routes/outcomes.js"

const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000

app.use(cors())
app.use(express.json())

app.get("/api/health", (_req, res) => res.json({ status: "ok" }))
app.use("/api/dashboard", dashboardRouter)
app.use("/api/contracts", contractsRouter)
app.use("/api/users", usersRouter)
app.use("/api/workflows", workflowsRouter)
app.use("/api/scenarios", scenariosRouter)
app.use("/api/outcomes", outcomesRouter)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ message: "Internal server error" })
})

app.listen(PORT, () => {
  console.log(`FlowPact API listening on http://localhost:${PORT}`)
})
