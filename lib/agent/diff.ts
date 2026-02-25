export interface CellChange {
  row: number
  column: string
  oldValue: string | null
  newValue: string | null
}

export interface DiffResult {
  summary: string
  rowsModified: number
  rowsRemoved: number
  rowsAdded: number
  cellChanges: CellChange[]
}

/**
 * Compute a diff between two datasets (arrays of row objects).
 * Returns a summary + first 50 cell-level changes for UI preview.
 */
export function computeDiff(
  oldRows: Record<string, unknown>[],
  newRows: Record<string, unknown>[],
  description: string
): DiffResult {
  const cellChanges: CellChange[] = []
  let rowsModified = 0

  // Get all columns from both datasets
  const oldCols = oldRows.length > 0 ? Object.keys(oldRows[0]) : []
  const newCols = newRows.length > 0 ? Object.keys(newRows[0]) : []
  const allCols = [...new Set([...oldCols, ...newCols])]

  // Compare rows that exist in both
  const minLen = Math.min(oldRows.length, newRows.length)
  for (let i = 0; i < minLen; i++) {
    let rowChanged = false
    for (const col of allCols) {
      const oldVal = stringify(oldRows[i]?.[col])
      const newVal = stringify(newRows[i]?.[col])
      if (oldVal !== newVal) {
        rowChanged = true
        if (cellChanges.length < 50) {
          cellChanges.push({
            row: i,
            column: col,
            oldValue: oldVal,
            newValue: newVal,
          })
        }
      }
    }
    if (rowChanged) rowsModified++
  }

  const rowsRemoved = Math.max(0, oldRows.length - newRows.length)
  const rowsAdded = Math.max(0, newRows.length - oldRows.length)

  // Build summary
  const parts: string[] = []
  if (rowsModified > 0) parts.push(`${rowsModified} rows modified`)
  if (rowsRemoved > 0) parts.push(`${rowsRemoved} rows removed`)
  if (rowsAdded > 0) parts.push(`${rowsAdded} rows added`)
  if (cellChanges.length > 0) parts.push(`${cellChanges.length} cell changes`)
  const summary = parts.length > 0
    ? `${description}: ${parts.join(", ")}`
    : `${description}: no changes`

  return {
    summary,
    rowsModified,
    rowsRemoved,
    rowsAdded,
    cellChanges,
  }
}

function stringify(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null
  return String(val)
}
