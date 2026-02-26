import { downloadFromR2 } from "@/lib/r2"
import { db } from "@/lib/db"
import { dataFiles, fileVersions, projects } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { parseFileContent } from "@/lib/parsers"
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

export interface FileSummary {
  fileId: string
  fileName: string
  rowCount: number
  columnCount: number
  columns: { name: string; type: string }[]
  versionNumber: number
}

export interface ProjectContext {
  projectId: string
  projectName: string
  files: FileSummary[]
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
  const ext = version.storagePath.split(".").pop()?.toLowerCase() ?? "csv"
  const parsed = parseFileContent(content, ext, file.mimeType ?? undefined)
  const allRows = parsed.rows

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
 * Load lightweight metadata for all files in a project (no data download).
 */
export async function loadProjectContext(projectId: string): Promise<ProjectContext | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      files: {
        with: {
          versions: {
            orderBy: [desc(fileVersions.versionNumber)],
            limit: 1,
          },
        },
      },
    },
  })

  if (!project) return null

  const files: FileSummary[] = project.files.map((f) => {
    const v = f.versions[0]
    return {
      fileId: f.id,
      fileName: f.name,
      rowCount: v?.rowCount ?? 0,
      columnCount: v?.columnCount ?? 0,
      columns: (v?.columns as { name: string; type: string }[]) ?? [],
      versionNumber: v?.versionNumber ?? 1,
    }
  })

  return { projectId: project.id, projectName: project.name, files }
}

/**
 * Build the system prompt with project-wide context + focused file contexts.
 */
export function buildSystemPrompt(
  projectCtx: ProjectContext | null,
  focusedFiles: FileContext[],
  activeFileId?: string | null
): string {
  let prompt = `You are Data Safai, an AI data cleaning agent. You help users analyze, clean, and transform datasets.\n\n`

  // Project overview
  if (projectCtx) {
    prompt += `## Project: ${projectCtx.projectName}\n`
    prompt += `This project has ${projectCtx.files.length} file(s):\n`
    for (const f of projectCtx.files) {
      const cols = f.columns.map((c) => c.name).join(", ")
      prompt += `- **${f.fileName}** (v${f.versionNumber}) — ${f.rowCount} rows, ${f.columnCount} cols: [${cols}]\n`
    }
    prompt += `\nUnderstanding relationships between these files is important for data cleaning decisions.\n\n`
  }

  // Detailed context for focused/tagged files
  if (focusedFiles.length > 0) {
    for (const ctx of focusedFiles) {
      const isActive = ctx.fileId === activeFileId
      const label = isActive ? "Active File" : "Referenced File"
      const columnList = ctx.columns
        .map((c) => `  - ${c.name} (${c.type})`)
        .join("\n")

      const sampleCsv = ctx.sampleRows.length > 0
        ? Papa.unparse(ctx.sampleRows)
        : "(empty dataset)"

      prompt += `## ${label}: ${ctx.fileName}\n`
      prompt += `- **Version**: v${ctx.versionNumber}\n`
      prompt += `- **Rows**: ${ctx.rowCount}\n`
      prompt += `- **Columns**: ${ctx.columnCount}\n\n`
      prompt += `### Column Schema\n${columnList}\n\n`
      prompt += `### Sample Data (first ${Math.min(ctx.sampleRows.length, 20)} rows)\n\`\`\`csv\n${sampleCsv}\n\`\`\`\n\n`
    }
  }

  prompt += `## Instructions
- When the user mentions a file with @filename, operate on that file.
- When the user asks about data quality, use the \`profile_dataset\` tool first.
- When the user asks to clean data, use the appropriate cleaning/transform tool.
- You can chain multiple tools in one response (e.g., profile first, then clean).
- Always explain what you're doing and what changed after each tool call.
- After a mutating tool, summarize the diff: how many rows/cells changed.
- Be concise. Use bullet points for summaries.
- Consider cross-file relationships when giving data cleaning advice.
- If the user's request is ambiguous, ask for clarification before modifying data.`

  return prompt
}

/**
 * Rough token estimate (~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
