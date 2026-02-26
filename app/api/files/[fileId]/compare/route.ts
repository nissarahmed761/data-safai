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

  const changes: {
    type: "modified" | "added" | "removed"
    rowIndex: number
    cells: { column: string; from: string | null; to: string | null }[]
  }[] = []

  const minLen = Math.min(fromRows.length, toRows.length)

  for (let i = 0; i < minLen; i++) {
    const cellDiffs: { column: string; from: string | null; to: string | null }[] = []
    for (const col of allCols) {
      const fv = stringify(fromRows[i]?.[col])
      const tv = stringify(toRows[i]?.[col])
      if (fv !== tv) {
        cellDiffs.push({ column: col, from: fv, to: tv })
      }
    }
    if (cellDiffs.length > 0) {
      changes.push({ type: "modified", rowIndex: i, cells: cellDiffs })
    }
  }

  // Removed rows
  for (let i = minLen; i < fromRows.length; i++) {
    changes.push({
      type: "removed",
      rowIndex: i,
      cells: allCols.map((col) => ({
        column: col,
        from: stringify(fromRows[i]?.[col]),
        to: null,
      })),
    })
  }

  // Added rows
  for (let i = minLen; i < toRows.length; i++) {
    changes.push({
      type: "added",
      rowIndex: i,
      cells: allCols.map((col) => ({
        column: col,
        from: null,
        to: stringify(toRows[i]?.[col]),
      })),
    })
  }

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
      modified: changes.filter((c) => c.type === "modified").length,
      added: changes.filter((c) => c.type === "added").length,
      removed: changes.filter((c) => c.type === "removed").length,
      totalCellChanges: changes.reduce((s, c) => s + c.cells.length, 0),
    },
    changes: changes.slice(0, 200), // Cap at 200 for performance
  })
}

function stringify(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null
  return String(val)
}
