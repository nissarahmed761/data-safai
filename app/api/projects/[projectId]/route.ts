import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"

// GET /api/projects/:projectId — get single project with files
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
    with: {
      files: {
        with: {
          versions: {
            columns: {
              id: true,
              versionNumber: true,
              rowCount: true,
              columnCount: true,
              columns: true,
              changeDescription: true,
              changedBy: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}

// PATCH /api/projects/:projectId — update project
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const body = await req.json()
  const { name, description } = body

  const existing = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  })

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning()

  return NextResponse.json(updated)
}

// DELETE /api/projects/:projectId — delete project (cascades files, versions, conversations)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  const existing = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  })

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  await db.delete(projects).where(eq(projects.id, projectId))

  return NextResponse.json({ deleted: true })
}
