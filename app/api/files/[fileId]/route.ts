import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { dataFiles, fileVersions, projects } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"
import { downloadFromR2, deleteFromR2 } from "@/lib/r2"
import { parseFileContent } from "@/lib/parsers"

// GET /api/files/:fileId — get file metadata + parsed data from current version
export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId } = await params

  // Get file with its project (to verify ownership)
  const file = await db.query.dataFiles.findFirst({
    where: eq(dataFiles.id, fileId),
    with: {
      project: true,
      versions: {
        orderBy: (v, { desc }) => [desc(v.versionNumber)],
      },
    },
  })

  if (!file || file.project.userId !== user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Check query params
  const url = new URL(req.url)
  const requestedVersionId = url.searchParams.get("versionId")
  const includeData = url.searchParams.get("data") !== "false"
  const page = parseInt(url.searchParams.get("page") ?? "1")
  const pageSize = parseInt(url.searchParams.get("pageSize") ?? "100")

  // Get requested version or latest
  const currentVersion = requestedVersionId
    ? file.versions.find((v) => v.id === requestedVersionId)
    : file.versions[0]
  if (!currentVersion) {
    return NextResponse.json(
      { error: "Version not found" },
      { status: 404 }
    )
  }

  let rows: Record<string, unknown>[] = []
  let totalRows = currentVersion.rowCount ?? 0

  if (includeData) {
    try {
      const content = await downloadFromR2(currentVersion.storagePath)
      const ext = currentVersion.storagePath.split(".").pop()?.toLowerCase() ?? "csv"
      const parsed = parseFileContent(content, ext, file.mimeType ?? undefined)
      totalRows = parsed.rowCount
      const start = (page - 1) * pageSize
      rows = parsed.rows.slice(start, start + pageSize)
    } catch (err) {
      console.error("Failed to download/parse file:", err)
      return NextResponse.json(
        { error: "Failed to read file data" },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    size: file.size,
    mimeType: file.mimeType,
    projectId: file.projectId,
    currentVersion: {
      id: currentVersion.id,
      versionNumber: currentVersion.versionNumber,
      rowCount: totalRows,
      columnCount: currentVersion.columnCount,
      columns: currentVersion.columns,
      changeDescription: currentVersion.changeDescription,
      changedBy: currentVersion.changedBy,
      createdAt: currentVersion.createdAt,
    },
    versions: file.versions.map((v) => ({
      id: v.id,
      versionNumber: v.versionNumber,
      rowCount: v.rowCount,
      columnCount: v.columnCount,
      changeDescription: v.changeDescription,
      changedBy: v.changedBy,
      createdAt: v.createdAt,
    })),
    data: rows,
    pagination: {
      page,
      pageSize,
      totalRows,
      totalPages: Math.ceil(totalRows / pageSize),
    },
  })
}

// DELETE /api/files/:fileId — delete a file and all its versions
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId } = await params

  const file = await db.query.dataFiles.findFirst({
    where: eq(dataFiles.id, fileId),
    with: {
      project: true,
      versions: true,
    },
  })

  if (!file || file.project.userId !== user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  // Delete all version files from R2
  for (const version of file.versions) {
    try {
      await deleteFromR2(version.storagePath)
    } catch (err) {
      console.error(`Failed to delete R2 object ${version.storagePath}:`, err)
    }
  }

  // Delete version records
  await db.delete(fileVersions).where(eq(fileVersions.fileId, fileId))

  // Delete file record
  await db.delete(dataFiles).where(eq(dataFiles.id, fileId))

  return NextResponse.json({ deleted: true })
}
