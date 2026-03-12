import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { projects, dataFiles, fileVersions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"
import { uploadToR2 } from "@/lib/r2"
import { ALLOWED_MIME_TYPES, isSupportedExt, parseFileContent, rowsToCsv } from "@/lib/parsers"

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
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const isAllowedType = ALLOWED_MIME_TYPES.includes(file.type)
    const isAllowedExt = isSupportedExt(ext)

    if (!isAllowedType && !isAllowedExt) {
      results.push({
        name: file.name,
        error: `Unsupported format. Accepted: CSV, JSON, TSV, XLSX, XLS`,
      })
      continue
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())

      // Parse file using shared parser
      const parsed = parseFileContent(buffer, ext, file.type)
      const { rows: allRows, columns, rowCount, columnCount } = parsed
      const sampleData = allRows.slice(0, 5)

      // For non-CSV formats, normalize to CSV for storage
      // This ensures the agent and file viewer always work with CSV
      const isNativeCsv = ext === "csv" || ext === "tsv"
      const storageContent = isNativeCsv
        ? buffer
        : Buffer.from(rowsToCsv(allRows), "utf-8")
      const storageMime = "text/csv"
      const storageName = isNativeCsv ? file.name : file.name.replace(/\.[^.]+$/, ".csv")

      // Upload to R2
      const r2Key = `${user.id}/${projectId}/${Date.now()}-${storageName}`
      await uploadToR2(r2Key, storageContent, storageMime)

      // Strip folder path prefix (e.g. "folder/sub/file.csv" -> "file.csv")
      const baseName = file.name.includes("/") ? file.name.split("/").pop()! : file.name

      // Create dataFile record
      const [dataFile] = await db
        .insert(dataFiles)
        .values({
          projectId,
          name: baseName,
          originalName: baseName,
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
