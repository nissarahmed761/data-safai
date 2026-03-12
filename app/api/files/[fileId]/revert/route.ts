import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { dataFiles, fileVersions } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { getDbUser } from "@/lib/auth"
import { downloadFromR2, uploadToR2 } from "@/lib/r2"

// POST /api/files/:fileId/revert — revert to a specific version (creates a new version)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { fileId } = await params
  const { versionId } = await req.json()

  if (!versionId) {
    return NextResponse.json(
      { error: "versionId is required" },
      { status: 400 }
    )
  }

  // Get file with versions
  const file = await db.query.dataFiles.findFirst({
    where: eq(dataFiles.id, fileId),
    with: {
      project: true,
      versions: {
        orderBy: (v, { desc: d }) => [d(v.versionNumber)],
      },
    },
  })

  if (!file || file.project.userId !== user.id) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const targetVersion = file.versions.find((v) => v.id === versionId)
  if (!targetVersion) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 })
  }

  const latestVersion = file.versions[0]
  if (targetVersion.id === latestVersion.id) {
    return NextResponse.json({ error: "Already on this version" }, { status: 400 })
  }

  // Download the target version's data
  const content = await downloadFromR2(targetVersion.storagePath)

  // Upload as a new version
  const newKey = `${targetVersion.storagePath.split("/").slice(0, 2).join("/")}/${Date.now()}-v${latestVersion.versionNumber + 1}-${file.name}`
  await uploadToR2(newKey, Buffer.from(content, "utf-8"), file.mimeType ?? "text/csv")

  // Create new version record
  const [newVersion] = await db
    .insert(fileVersions)
    .values({
      fileId,
      versionNumber: latestVersion.versionNumber + 1,
      storagePath: newKey,
      rowCount: targetVersion.rowCount,
      columnCount: targetVersion.columnCount,
      columns: targetVersion.columns,
      sampleData: targetVersion.sampleData,
      changeDescription: `Reverted to v${targetVersion.versionNumber}`,
      changedBy: "user",
    })
    .returning()

  // Update current version pointer
  await db
    .update(dataFiles)
    .set({ currentVersionId: newVersion.id })
    .where(eq(dataFiles.id, fileId))

  return NextResponse.json({
    id: newVersion.id,
    versionNumber: newVersion.versionNumber,
    changeDescription: newVersion.changeDescription,
  })
}
