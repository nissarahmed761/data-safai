import Papa from "papaparse"
import * as XLSX from "xlsx"

/** Supported file extensions */
export const SUPPORTED_EXTENSIONS = ["csv", "json", "tsv", "xlsx", "xls"] as const
export type SupportedExt = (typeof SUPPORTED_EXTENSIONS)[number]

/** MIME types we accept on upload */
export const ALLOWED_MIME_TYPES = [
  "text/csv",
  "text/tab-separated-values",
  "application/json",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]

/** Accept string for <input type="file"> */
export const FILE_ACCEPT = SUPPORTED_EXTENSIONS.map((e) => `.${e}`).join(",")

/** Check if a file extension is supported */
export function isSupportedExt(ext: string | undefined): ext is SupportedExt {
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExt)
}

/** Human-readable label for a file extension */
export function extLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "csv": return "CSV"
    case "tsv": return "TSV"
    case "json": return "JSON"
    case "xlsx": return "XLSX"
    case "xls": return "XLS"
    default: return ext?.toUpperCase() ?? "FILE"
  }
}

export interface ParseResult {
  rows: Record<string, unknown>[]
  columns: { name: string; type: string }[]
  rowCount: number
  columnCount: number
}

/**
 * Parse file content (string or Buffer) into rows based on extension/mimeType.
 * For xlsx/xls, pass the raw Buffer. For csv/tsv/json, pass the UTF-8 string.
 */
export function parseFileContent(
  content: string | Buffer,
  ext: string,
  mimeType?: string
): ParseResult {
  const normalizedExt = ext.toLowerCase()

  if (normalizedExt === "xlsx" || normalizedExt === "xls" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel") {
    return parseXlsx(content)
  }

  // Ensure string for text-based formats
  const text = typeof content === "string" ? content : content.toString("utf-8")

  if (normalizedExt === "tsv" || mimeType === "text/tab-separated-values") {
    return parseCsv(text, "\t")
  }

  if (normalizedExt === "csv" || mimeType === "text/csv") {
    return parseCsv(text, ",")
  }

  if (normalizedExt === "json" || mimeType === "application/json") {
    return parseJson(text)
  }

  // Fallback: try CSV auto-detect
  return parseCsv(text)
}

function parseCsv(content: string, delimiter?: string): ParseResult {
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter,
  })

  const rows = parsed.data as Record<string, unknown>[]
  const fields = parsed.meta.fields ?? []
  const columns = fields.map((name) => {
    const sample = rows.find(
      (row) => row[name] !== "" && row[name] !== undefined && row[name] !== null
    )
    const val = sample?.[name] ?? ""
    let type = "string"
    if (!isNaN(Number(val)) && val !== "") type = "number"
    else if (
      String(val).toLowerCase() === "true" ||
      String(val).toLowerCase() === "false"
    )
      type = "boolean"
    return { name, type }
  })

  return {
    rows,
    columns,
    rowCount: rows.length,
    columnCount: fields.length,
  }
}

function parseJson(content: string): ParseResult {
  const jsonData = JSON.parse(content)
  const rows: Record<string, unknown>[] = Array.isArray(jsonData)
    ? jsonData
    : [jsonData]

  let columns: { name: string; type: string }[] = []
  if (rows.length > 0 && typeof rows[0] === "object" && rows[0] !== null) {
    const keys = Object.keys(rows[0])
    columns = keys.map((name) => ({
      name,
      type: typeof rows[0][name],
    }))
  }

  return {
    rows,
    columns,
    rowCount: rows.length,
    columnCount: columns.length,
  }
}

function parseXlsx(content: string | Buffer): ParseResult {
  const buf = typeof content === "string"
    ? Buffer.from(content, "binary")
    : content
  const workbook = XLSX.read(buf, { type: "buffer" })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { rows: [], columns: [], rowCount: 0, columnCount: 0 }
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  })

  let columns: { name: string; type: string }[] = []
  if (rows.length > 0) {
    const keys = Object.keys(rows[0])
    columns = keys.map((name) => {
      const sample = rows.find(
        (r) => r[name] !== "" && r[name] !== undefined && r[name] !== null
      )
      const val = sample?.[name] ?? ""
      let type = "string"
      if (typeof val === "number") type = "number"
      else if (typeof val === "boolean") type = "boolean"
      else if (!isNaN(Number(val)) && val !== "") type = "number"
      return { name, type }
    })
  }

  return {
    rows,
    columns,
    rowCount: rows.length,
    columnCount: columns.length,
  }
}

/**
 * Convert rows back to CSV string (used when saving new versions from agent).
 * All formats are normalized to CSV for storage after initial upload.
 */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  return Papa.unparse(rows)
}
