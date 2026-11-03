import { Router } from "express"
import { prisma } from "../db/client.js"

export const usersRouter = Router()

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } })
  res.json({ users })
})
