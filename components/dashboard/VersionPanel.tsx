"use client"

import { useState, useCallback } from "react"
import {
  History,
  RotateCcw,
  GitCompareArrows,
  User,
  Bot,
  ChevronDown,
  X,
  Plus,
  Minus,
  Pencil,
  Loader2,
} from "lucide-react"

interface Version {
  id: string
  versionNumber: number
  rowCount: number
  columnCount: number
  changeDescription: string
  changedBy: string
  createdAt: string
}

interface DiffSummary {
  modified: number
  added: number
  removed: number
  totalCellChanges: number
}

interface DiffChange {
  type: "modified" | "added" | "removed"
  rowIndex: number
  cells: { column: string; from: string | null; to: string | null }[]
}

interface DiffData {
  from: { versionNumber: number; rowCount: number; columnCount: number }
  to: { versionNumber: number; rowCount: number; columnCount: number }
  columns: string[]
  summary: DiffSummary
  changes: DiffChange[]
}

interface VersionPanelProps {
  fileId: string
  versions: Version[]
  viewingVersionId: string | null
  onViewVersion: (versionId: string | null) => void
  onRevert: (versionId: string) => void
}

export default function VersionPanel({
  fileId,
  versions,
  viewingVersionId,
  onViewVersion,
  onRevert,
}: VersionPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [compareFrom, setCompareFrom] = useState<string | null>(null)
  const [compareTo, setCompareTo] = useState<string | null>(null)
  const [diffData, setDiffData] = useState<DiffData | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  // Versions sorted oldest → newest
  const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber)
  const latestVersion = sorted[sorted.length - 1]

  const activeVersionId = viewingVersionId ?? latestVersion?.id

  const handleCompare = useCallback(async () => {
    if (!compareFrom || !compareTo) return
    setDiffLoading(true)
    try {
      const res = await fetch(
        `/api/files/${fileId}/compare?from=${compareFrom}&to=${compareTo}`
      )
      if (res.ok) {
        const data = await res.json()
        setDiffData(data)
        setShowDiff(true)
      }
    } catch (err) {
      console.error("Failed to load diff:", err)
    } finally {
      setDiffLoading(false)
    }
  }, [fileId, compareFrom, compareTo])

  const closeDiff = () => {
    setShowDiff(false)
    setDiffData(null)
    setCompareFrom(null)
    setCompareTo(null)
  }

  // Quick compare: click two versions to compare
  const handleVersionClick = (versionId: string) => {
    if (compareFrom && !compareTo && compareFrom !== versionId) {
      setCompareTo(versionId)
    } else {
      // Normal view mode
      if (versionId === latestVersion?.id) {
        onViewVersion(null)
      } else {
        onViewVersion(versionId)
      }
    }
  }

  const startCompareMode = () => {
    setCompareFrom(null)
    setCompareTo(null)
    setShowDiff(false)
    setDiffData(null)
  }

  if (versions.length <= 1) return null

  return (
    <div className="mb-3 shrink-0">
      {/* Version bar */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-3 w-3" />
          <span>{sorted.length} versions</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Compact version pills */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {sorted.map((v) => {
            const isLatest = v.id === latestVersion?.id
            const isActive = v.id === activeVersionId
            const isCompareSelected =
              v.id === compareFrom || v.id === compareTo

            return (
              <button
                key={v.id}
                onClick={() => handleVersionClick(v.id)}
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium transition-all ${
                  isCompareSelected
                    ? "bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30"
                    : isActive
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={v.changeDescription || `v${v.versionNumber}`}
              >
                v{v.versionNumber}
                {isLatest && <span className="ml-0.5 opacity-50">•</span>}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {compareFrom && compareTo ? (
            <button
              onClick={handleCompare}
              disabled={diffLoading}
              className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500 hover:bg-blue-500/20 transition-colors"
            >
              {diffLoading ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <GitCompareArrows className="h-2.5 w-2.5" />
              )}
              Compare
            </button>
          ) : (
            <button
              onClick={startCompareMode}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Select two versions to compare"
            >
              <GitCompareArrows className="h-2.5 w-2.5" />
              Diff
            </button>
          )}

          {viewingVersionId && viewingVersionId !== latestVersion?.id && (
            <button
              onClick={() => onRevert(viewingVersionId)}
              className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              Revert
            </button>
          )}
        </div>
      </div>

      {/* Compare mode hint */}
      {compareFrom && !compareTo && (
        <div className="mt-1.5 text-[10px] text-blue-500 animate-pulse">
          Select second version to compare...
        </div>
      )}

      {/* Expanded version details */}
      {expanded && (
        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {sorted.map((v) => {
            const isLatest = v.id === latestVersion?.id
            const isActive = v.id === activeVersionId
            const time = new Date(v.createdAt)
            const timeStr = time.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })

            return (
              <button
                key={v.id}
                onClick={() => handleVersionClick(v.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <div className="flex flex-col items-center mt-0.5">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      isActive ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                  {!isLatest && (
                    <div className="w-px h-3 bg-border/50 mt-0.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-semibold ${
                        isActive ? "text-primary" : "text-foreground"
                      }`}
                    >
                      v{v.versionNumber}
                    </span>
                    {isLatest && (
                      <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0 rounded-full">
                        latest
                      </span>
                    )}
                    {v.changedBy === "ai" ? (
                      <Bot className="h-2.5 w-2.5 text-primary/60" />
                    ) : (
                      <User className="h-2.5 w-2.5 text-muted-foreground/60" />
                    )}
                    <span className="text-[9px] text-muted-foreground ml-auto shrink-0">
                      {timeStr}
                    </span>
                  </div>
                  {v.changeDescription && (
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {v.changeDescription}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground/60">
                    <span>{v.rowCount} rows</span>
                    <span>{v.columnCount} cols</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Diff viewer */}
      {showDiff && diffData && (
        <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden">
          {/* Diff header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/10">
            <GitCompareArrows className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs font-medium text-blue-500">
              v{diffData.from.versionNumber} → v{diffData.to.versionNumber}
            </span>
            <div className="flex items-center gap-2 ml-2 text-[10px]">
              {diffData.summary.modified > 0 && (
                <span className="flex items-center gap-0.5 text-yellow-500">
                  <Pencil className="h-2.5 w-2.5" />
                  {diffData.summary.modified} modified
                </span>
              )}
              {diffData.summary.added > 0 && (
                <span className="flex items-center gap-0.5 text-green-500">
                  <Plus className="h-2.5 w-2.5" />
                  {diffData.summary.added} added
                </span>
              )}
              {diffData.summary.removed > 0 && (
                <span className="flex items-center gap-0.5 text-red-500">
                  <Minus className="h-2.5 w-2.5" />
                  {diffData.summary.removed} removed
                </span>
              )}
            </div>
            <button
              onClick={closeDiff}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Diff table */}
          <div className="max-h-64 overflow-auto">
            {diffData.changes.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                No differences found
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-blue-500/5 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium w-8">
                      #
                    </th>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium w-12">
                      Type
                    </th>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium">
                      Column
                    </th>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium">
                      Before
                    </th>
                    <th className="text-left px-2 py-1 text-muted-foreground font-medium">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {diffData.changes.flatMap((change) =>
                    change.cells.map((cell, ci) => (
                      <tr
                        key={`${change.rowIndex}-${ci}`}
                        className={`border-t border-border/20 ${
                          change.type === "added"
                            ? "bg-green-500/5"
                            : change.type === "removed"
                              ? "bg-red-500/5"
                              : ""
                        }`}
                      >
                        {ci === 0 ? (
                          <td
                            className="px-2 py-1 text-muted-foreground font-mono"
                            rowSpan={change.cells.length}
                          >
                            {change.rowIndex + 1}
                          </td>
                        ) : null}
                        {ci === 0 ? (
                          <td rowSpan={change.cells.length} className="px-2 py-1">
                            <span
                              className={`inline-flex items-center gap-0.5 text-[9px] font-medium rounded px-1 py-0 ${
                                change.type === "modified"
                                  ? "bg-yellow-500/10 text-yellow-600"
                                  : change.type === "added"
                                    ? "bg-green-500/10 text-green-600"
                                    : "bg-red-500/10 text-red-600"
                              }`}
                            >
                              {change.type === "modified" ? (
                                <Pencil className="h-2 w-2" />
                              ) : change.type === "added" ? (
                                <Plus className="h-2 w-2" />
                              ) : (
                                <Minus className="h-2 w-2" />
                              )}
                              {change.type}
                            </span>
                          </td>
                        ) : null}
                        <td className="px-2 py-1 font-mono text-foreground">
                          {cell.column}
                        </td>
                        <td className="px-2 py-1 font-mono text-red-400 line-through">
                          {cell.from ?? <span className="text-muted-foreground/30 no-underline">null</span>}
                        </td>
                        <td className="px-2 py-1 font-mono text-green-500">
                          {cell.to ?? <span className="text-muted-foreground/30">null</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
