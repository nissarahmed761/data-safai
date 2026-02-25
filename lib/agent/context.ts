import { downloadFromR2 } from "@/lib/r2"
import { db } from "@/lib/db"
import { dataFiles, fileVersions } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import Papa from "papaparse"

export interface FileContext {
  fileId: string
  fileName: string
  mimeType: string
  versionNumber: number
  versionId: string
  storagePath: string
  rowCount: number
  columnCount: number
  columns: { name: string; type: string }[]
  sampleRows: Record<string, unknown>[]
  allRows: Record<string, unknown>[]
}

/**
 * Load full file context for the agent system prompt.
 * Returns parsed data + metadata for the current version.
 */
export async function loadFileContext(fileId: string): Promise<FileContext | null> {
  const file = await db.query.dataFiles.findFirst({
    where: eq(dataFiles.id, fileId),
    with: {
      versions: {
        orderBy: [desc(fileVersions.versionNumber)],
        limit: 1,
      },
    },
  })

  if (!file || file.versions.length === 0) return null

  const version = file.versions[0]
  const content = await downloadFromR2(version.storagePath)

  let allRows: Record<string, unknown>[] = []
  const ext = file.name.split(".").pop()?.toLowerCase()

  if (ext === "csv" || file.mimeType === "text/csv") {
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
    allRows = parsed.data as Record<string, unknown>[]
  } else if (ext === "json") {
    const jsonData = JSON.parse(content)
    allRows = Array.isArray(jsonData) ? jsonData : [jsonData]
  }

  return {
    fileId: file.id,
    fileName: file.name,
    mimeType: file.mimeType ?? "text/csv",
    versionNumber: version.versionNumber,
    versionId: version.id,
    storagePath: version.storagePath,
    rowCount: allRows.length,
    columnCount: (version.columns as { name: string; type: string }[])?.length ?? 0,
    columns: (version.columns as { name: string; type: string }[]) ?? [],
    sampleRows: allRows.slice(0, 20),
    allRows,
  }
}

/**
 * Build the system prompt for the agent given file context.
 */
export function buildSystemPrompt(ctx: FileContext): string {
  const columnList = ctx.columns
    .map((c) => `  - ${c.name} (${c.type})`)
    .join("\n")

  const sampleCsv = ctx.sampleRows.length > 0
    ? Papa.unparse(ctx.sampleRows)
    : "(empty dataset)"

  return `You are Data Safai, an AI data cleaning agent. You help users analyze, clean, and transform CSV/JSON datasets.

## Current File
- **Name**: ${ctx.fileName}
- **Version**: v${ctx.versionNumber}
- **Rows**: ${ctx.rowCount}
- **Columns**: ${ctx.columnCount}

## Column Schema
${columnList}

## Sample Data (first ${Math.min(ctx.sampleRows.length, 20)} rows)
\`\`\`csv
${sampleCsv}
\`\`\`

## Instructions
- When the user asks about data quality, use the \`profile_dataset\` tool first.
- When the user asks to clean data, use the appropriate cleaning/transform tool.
- You can chain multiple tools in one response (e.g., profile first, then clean).
- Always explain what you're doing and what changed after each tool call.
- After a mutating tool, summarize the diff: how many rows/cells changed.
- Be concise. Use bullet points for summaries.
- If the user's request is ambiguous, ask for clarification before modifying data.`
}
