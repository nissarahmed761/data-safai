import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { dataFiles, fileVersions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"
import { downloadFromR2 } from "@/lib/r2"
import { parseFileContent } from "@/lib/parsers"

// GET /api/files/:fileId/compare?from=versionId&to=versionId
export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId } = await params
  const url = new URL(req.url)
  const fromId = url.searchParams.get("from")
  const toId = url.searchParams.get("to")

  if (!fromId || !toId) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' version IDs are required" },
      { status: 400 }
    )
  }

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

  const fromVersion = file.versions.find((v) => v.id === fromId)
  const toVersion = file.versions.find((v) => v.id === toId)

  if (!fromVersion || !toVersion) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 })
  }

  // Download and parse both versions
  const [fromContent, toContent] = await Promise.all([
    downloadFromR2(fromVersion.storagePath),
    downloadFromR2(toVersion.storagePath),
  ])

  const fromExt = fromVersion.storagePath.split(".").pop()?.toLowerCase() ?? "csv"
  const toExt = toVersion.storagePath.split(".").pop()?.toLowerCase() ?? "csv"

  const fromParsed = parseFileContent(fromContent, fromExt)
  const toParsed = parseFileContent(toContent, toExt)

  // Compute diff
  const fromRows = fromParsed.rows
  const toRows = toParsed.rows

  const allCols = [
    ...new Set([
      ...fromParsed.columns.map((c) => c.name),
      ...toParsed.columns.map((c) => c.name),
    ]),
  ]

  // Build unified diff lines (git-style)
  const lines: {
    type: "modified" | "added" | "removed" | "context"
    rowIndex: number
    fromRow: Record<string, string | null> | null
    toRow: Record<string, string | null> | null
    changedCols: string[]
  }[] = []

  const minLen = Math.min(fromRows.length, toRows.length)
  let modifiedCount = 0
  let totalCellChanges = 0

  for (let i = 0; i < minLen; i++) {
    const changed: string[] = []
    for (const col of allCols) {
      if (stringify(fromRows[i]?.[col]) !== stringify(toRows[i]?.[col])) {
        changed.push(col)
      }
    }
    if (changed.length > 0) {
      modifiedCount++
      totalCellChanges += changed.length
      const fromRow: Record<string, string | null> = {}
      const toRow: Record<string, string | null> = {}
      for (const col of allCols) {
        fromRow[col] = stringify(fromRows[i]?.[col])
        toRow[col] = stringify(toRows[i]?.[col])
      }
      lines.push({ type: "modified", rowIndex: i, fromRow, toRow, changedCols: changed })
    }
  }

  // Removed rows
  for (let i = minLen; i < fromRows.length; i++) {
    const fromRow: Record<string, string | null> = {}
    for (const col of allCols) fromRow[col] = stringify(fromRows[i]?.[col])
    lines.push({ type: "removed", rowIndex: i, fromRow, toRow: null, changedCols: allCols })
  }

  // Added rows
  for (let i = minLen; i < toRows.length; i++) {
    const toRow: Record<string, string | null> = {}
    for (const col of allCols) toRow[col] = stringify(toRows[i]?.[col])
    lines.push({ type: "added", rowIndex: i, fromRow: null, toRow, changedCols: allCols })
  }

  const addedCount = lines.filter((l) => l.type === "added").length
  const removedCount = lines.filter((l) => l.type === "removed").length

  return NextResponse.json({
    from: {
      versionNumber: fromVersion.versionNumber,
      rowCount: fromParsed.rowCount,
      columnCount: fromParsed.columnCount,
    },
    to: {
      versionNumber: toVersion.versionNumber,
      rowCount: toParsed.rowCount,
      columnCount: toParsed.columnCount,
    },
    columns: allCols,
    summary: {
      modified: modifiedCount,
      added: addedCount,
      removed: removedCount,
      totalCellChanges,
    },
    lines: lines.slice(0, 200),
  })
}

function stringify(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null
  return String(val)
}
