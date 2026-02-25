import { tool } from "ai"
import { z } from "zod"
import type { FileContext } from "../context"

interface ColumnProfile {
  name: string
  type: string
  nullCount: number
  uniqueCount: number
  min?: number
  max?: number
  mean?: number
  topValues: { value: string; count: number }[]
}

/**
 * Creates a profile_dataset tool bound to a specific file context.
 * Read-only — does not mutate data.
 */
export function createProfileDatasetTool(ctx: FileContext) {
  return tool({
    description:
      "Profile the entire dataset. Returns row count, column count, and per-column stats (type, null count, unique count, min/max/mean for numbers, top values).",
    inputSchema: z.object({}),
    execute: async () => {
      const rows = ctx.allRows
      const columnProfiles: ColumnProfile[] = []

      for (const col of ctx.columns) {
        const values = rows.map((r) => r[col.name])
        const nonNull = values.filter(
          (v) => v !== null && v !== undefined && v !== ""
        )
        const nullCount = values.length - nonNull.length

        // Unique values
        const uniqueSet = new Set(nonNull.map(String))
        const uniqueCount = uniqueSet.size

        // Top values (most frequent)
        const freq: Record<string, number> = {}
        for (const v of nonNull) {
          const s = String(v)
          freq[s] = (freq[s] || 0) + 1
        }
        const topValues = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({ value, count }))

        // Numeric stats
        let min: number | undefined
        let max: number | undefined
        let mean: number | undefined

        if (col.type === "number") {
          const nums = nonNull.map(Number).filter((n) => !isNaN(n))
          if (nums.length > 0) {
            min = Math.min(...nums)
            max = Math.max(...nums)
            mean = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
          }
        }

        columnProfiles.push({
          name: col.name,
          type: col.type,
          nullCount,
          uniqueCount,
          min,
          max,
          mean,
          topValues,
        })
      }

      return {
        fileName: ctx.fileName,
        version: ctx.versionNumber,
        rowCount: rows.length,
        columnCount: ctx.columns.length,
        columns: columnProfiles,
      }
    },
  })
}
