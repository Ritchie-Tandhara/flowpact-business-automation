import { Router } from "express"
import { prisma } from "../db/client.js"

export const workflowsRouter = Router()

workflowsRouter.get("/", async (_req, res) => {
  const workflows = await prisma.workflow.findMany({
    select: { id: true, name: true, domain: true, status: true },
    orderBy: { name: "asc" },
  })
  res.json({ workflows })
})
