import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects, dataFiles } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"

// GET /api/projects — list all projects for the current user (with files)
export async function GET() {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, user.id),
    orderBy: [desc(projects.createdAt)],
    with: {
      files: {
        columns: {
          id: true,
          name: true,
          originalName: true,
          size: true,
          mimeType: true,
          currentVersionId: true,
          createdAt: true,
        },
      },
    },
  })

  return NextResponse.json(userProjects)
}

// POST /api/projects — create a new project
export async function POST(req: Request) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, description, source, githubRepo } = body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    )
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      source: source === "github" ? "github" : "upload",
      githubRepo: githubRepo?.trim() || null,
    })
    .returning()

  return NextResponse.json(project, { status: 201 })
}
