import { tool } from "ai"
import { z } from "zod"
import type { FileContext } from "../context"
import { computeDiff } from "../diff"
import { uploadToR2 } from "@/lib/r2"
import { db } from "@/lib/db"
import { dataFiles, fileVersions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Papa from "papaparse"

/**
 * Creates a remove_nulls tool bound to a specific file context.
 * Mutating — modifies data, saves new version, returns diff.
 */
export function createRemoveNullsTool(ctx: FileContext) {
  return tool({
    description:
      "Remove or fill null/empty values in a column. Strategies: drop_rows (remove rows with nulls), fill_mean (fill with column mean), fill_median (fill with median), fill_mode (fill with most frequent value), fill_constant (fill with a specified value).",
    inputSchema: z.object({
      column: z.string().describe("Column name to clean"),
      strategy: z.enum([
        "drop_rows",
        "fill_mean",
        "fill_median",
        "fill_mode",
        "fill_constant",
      ]),
      fillValue: z
        .string()
        .optional()
        .describe("Value to fill with when strategy is fill_constant"),
    }),
    execute: async ({ column, strategy, fillValue }) => {
      const rows = ctx.allRows
      const oldRows = rows.map((r) => ({ ...r }))

      // Validate column exists
      if (!ctx.columns.find((c) => c.name === column)) {
        return { error: `Column '${column}' not found. Available: ${ctx.columns.map((c) => c.name).join(", ")}` }
      }

      // Count nulls
      const nullIndices = rows
        .map((r, i) => ({ i, v: r[column] }))
        .filter(({ v }) => v === null || v === undefined || v === "")
        .map(({ i }) => i)

      if (nullIndices.length === 0) {
        return { message: `No null values found in column '${column}'.` }
      }

      let newRows: Record<string, unknown>[]
      let description: string

      switch (strategy) {
        case "drop_rows": {
          const nullSet = new Set(nullIndices)
          newRows = rows.filter((_, i) => !nullSet.has(i))
          description = `Dropped ${nullIndices.length} rows with null '${column}'`
          break
        }
        case "fill_mean": {
          const nums = rows
            .map((r) => Number(r[column]))
            .filter((n) => !isNaN(n))
          if (nums.length === 0) {
            return { error: `Column '${column}' has no numeric values for mean calculation.` }
          }
          const mean = nums.reduce((a, b) => a + b, 0) / nums.length
          const rounded = Math.round(mean * 100) / 100
          newRows = rows.map((r) => {
            const v = r[column]
            if (v === null || v === undefined || v === "") {
              return { ...r, [column]: rounded }
            }
            return { ...r }
          })
          description = `Filled ${nullIndices.length} nulls in '${column}' with mean (${rounded})`
          break
        }
        case "fill_median": {
          const nums = rows
            .map((r) => Number(r[column]))
            .filter((n) => !isNaN(n))
            .sort((a, b) => a - b)
          if (nums.length === 0) {
            return { error: `Column '${column}' has no numeric values for median calculation.` }
          }
          const mid = Math.floor(nums.length / 2)
          const median =
            nums.length % 2 === 0
              ? (nums[mid - 1] + nums[mid]) / 2
              : nums[mid]
          newRows = rows.map((r) => {
            const v = r[column]
            if (v === null || v === undefined || v === "") {
              return { ...r, [column]: median }
            }
            return { ...r }
          })
          description = `Filled ${nullIndices.length} nulls in '${column}' with median (${median})`
          break
        }
        case "fill_mode": {
          const freq: Record<string, number> = {}
          for (const r of rows) {
            const v = r[column]
            if (v !== null && v !== undefined && v !== "") {
              const s = String(v)
              freq[s] = (freq[s] || 0) + 1
            }
          }
          const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]
          if (!mode) {
            return { error: `Column '${column}' has no non-null values for mode calculation.` }
          }
          newRows = rows.map((r) => {
            const v = r[column]
            if (v === null || v === undefined || v === "") {
              return { ...r, [column]: mode }
            }
            return { ...r }
          })
          description = `Filled ${nullIndices.length} nulls in '${column}' with mode ('${mode}')`
          break
        }
        case "fill_constant": {
          const val = fillValue ?? ""
          newRows = rows.map((r) => {
            const v = r[column]
            if (v === null || v === undefined || v === "") {
              return { ...r, [column]: val }
            }
            return { ...r }
          })
          description = `Filled ${nullIndices.length} nulls in '${column}' with '${val}'`
          break
        }
        default:
          return { error: `Unknown strategy: ${strategy}` }
      }

      // Compute diff
      const diff = computeDiff(oldRows, newRows, description)

      // Save new version to R2
      const newCsv = Papa.unparse(newRows)
      const newKey = `${ctx.storagePath.split("/").slice(0, 2).join("/")}/${Date.now()}-v${ctx.versionNumber + 1}-${ctx.fileName}`
      await uploadToR2(newKey, Buffer.from(newCsv, "utf-8"), "text/csv")

      // Infer columns for new version
      const newCols = newRows.length > 0
        ? Object.keys(newRows[0]).map((name) => {
            const sample = newRows.find((r) => r[name] !== null && r[name] !== undefined && r[name] !== "")
            const val = sample?.[name] ?? ""
            let type = "string"
            if (!isNaN(Number(val)) && val !== "") type = "number"
            return { name, type }
          })
        : ctx.columns

      // Create new file version in DB
      const [version] = await db
        .insert(fileVersions)
        .values({
          fileId: ctx.fileId,
          versionNumber: ctx.versionNumber + 1,
          storagePath: newKey,
          rowCount: newRows.length,
          columnCount: newCols.length,
          columns: newCols,
          sampleData: newRows.slice(0, 5),
          changeDescription: description,
          changedBy: "ai",
        })
        .returning()

      // Update current version pointer
      await db
        .update(dataFiles)
        .set({ currentVersionId: version.id })
        .where(eq(dataFiles.id, ctx.fileId))

      // Update context in-place for subsequent tool calls in the same turn
      ctx.allRows = newRows
      ctx.sampleRows = newRows.slice(0, 20)
      ctx.rowCount = newRows.length
      ctx.versionNumber = version.versionNumber
      ctx.versionId = version.id
      ctx.storagePath = newKey
      ctx.columns = newCols

      return {
        diff: {
          summary: diff.summary,
          rowsModified: diff.rowsModified,
          rowsRemoved: diff.rowsRemoved,
          rowsAdded: diff.rowsAdded,
          cellChanges: diff.cellChanges,
        },
        version: {
          id: version.id,
          versionNumber: version.versionNumber,
          rowCount: newRows.length,
          columnCount: newCols.length,
          changeDescription: description,
        },
      }
    },
  })
}
