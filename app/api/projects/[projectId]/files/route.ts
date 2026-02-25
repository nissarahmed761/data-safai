import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects, dataFiles, fileVersions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"
import { uploadToR2 } from "@/lib/r2"
import Papa from "papaparse"

const ALLOWED_TYPES = [
  "text/csv",
  "application/json",
  "application/vnd.ms-excel",
  "text/plain",
]
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// POST /api/projects/:projectId/files — upload files to a project
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, user.id)),
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const formData = await req.formData()
  const files = formData.getAll("files") as File[]

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 })
  }

  const results = []

  for (const file of files) {
    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      results.push({ name: file.name, error: "File too large (max 50MB)" })
      continue
    }

    // Validate type (be lenient — check extension too)
    const ext = file.name.split(".").pop()?.toLowerCase()
    const isAllowedType = ALLOWED_TYPES.includes(file.type)
    const isAllowedExt = ext === "csv" || ext === "json"

    if (!isAllowedType && !isAllowedExt) {
      results.push({
        name: file.name,
        error: "Only CSV and JSON files are supported",
      })
      continue
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const content = buffer.toString("utf-8")

      // Parse CSV/JSON to extract metadata
      let rowCount = 0
      let columnCount = 0
      let columns: { name: string; type: string }[] = []
      let sampleData: Record<string, unknown>[] = []

      if (ext === "csv" || file.type === "text/csv") {
        const parsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          preview: 100, // parse first 100 rows for sample
        })
        const allParsed = Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
        })
        rowCount = allParsed.data.length
        columnCount = parsed.meta.fields?.length ?? 0
        columns = (parsed.meta.fields ?? []).map((name) => {
          // Infer basic type from first non-empty value
          const sample = (parsed.data as Record<string, string>[]).find(
            (row) => row[name] !== "" && row[name] !== undefined
          )
          const val = sample?.[name] ?? ""
          let type = "string"
          if (!isNaN(Number(val)) && val !== "") type = "number"
          else if (
            val.toLowerCase() === "true" ||
            val.toLowerCase() === "false"
          )
            type = "boolean"
          return { name, type }
        })
        sampleData = (parsed.data as Record<string, unknown>[]).slice(0, 5)
      } else if (ext === "json") {
        const jsonData = JSON.parse(content)
        const rows = Array.isArray(jsonData) ? jsonData : [jsonData]
        rowCount = rows.length
        if (rows.length > 0 && typeof rows[0] === "object") {
          const keys = Object.keys(rows[0])
          columnCount = keys.length
          columns = keys.map((name) => {
            const val = rows[0][name]
            return { name, type: typeof val }
          })
          sampleData = rows.slice(0, 5)
        }
      }

      // Upload to R2
      const r2Key = `${user.id}/${projectId}/${Date.now()}-${file.name}`
      await uploadToR2(r2Key, buffer, file.type || "text/csv")

      // Create dataFile record
      const [dataFile] = await db
        .insert(dataFiles)
        .values({
          projectId,
          name: file.name,
          originalName: file.name,
          size: file.size,
          mimeType: file.type || (ext === "csv" ? "text/csv" : "application/json"),
        })
        .returning()

      // Create initial version (v1)
      const [version] = await db
        .insert(fileVersions)
        .values({
          fileId: dataFile.id,
          versionNumber: 1,
          storagePath: r2Key,
          rowCount,
          columnCount,
          columns,
          sampleData,
          changeDescription: "Initial upload",
          changedBy: "user",
        })
        .returning()

      // Link current version
      await db
        .update(dataFiles)
        .set({ currentVersionId: version.id })
        .where(eq(dataFiles.id, dataFile.id))

      results.push({
        name: file.name,
        fileId: dataFile.id,
        versionId: version.id,
        rowCount,
        columnCount,
        columns,
      })
    } catch (err) {
      console.error(`Failed to process ${file.name}:`, err)
      results.push({ name: file.name, error: "Failed to process file" })
    }
  }

  return NextResponse.json({ results }, { status: 201 })
}

// GET /api/projects/:projectId/files — list files in project
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
        with: { versions: true },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  return NextResponse.json(project.files)
}
