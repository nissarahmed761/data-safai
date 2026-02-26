"use client"

import { useState, useCallback } from "react"
import {
  History,
  RotateCcw,
  GitCompareArrows,
  User,
  Bot,
  X,
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

interface DiffLine {
  type: "modified" | "added" | "removed" | "context"
  rowIndex: number
  fromRow: Record<string, string | null> | null
  toRow: Record<string, string | null> | null
  changedCols: string[]
}

interface DiffData {
  from: { versionNumber: number; rowCount: number; columnCount: number }
  to: { versionNumber: number; rowCount: number; columnCount: number }
  columns: string[]
  summary: DiffSummary
  lines: DiffLine[]
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
  const [compareMode, setCompareMode] = useState(false)
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
    setCompareMode(false)
    setCompareFrom(null)
    setCompareTo(null)
  }

  const handleVersionClick = (versionId: string) => {
    if (compareMode) {
      if (!compareFrom) {
        setCompareFrom(versionId)
      } else if (compareFrom !== versionId) {
        setCompareTo(versionId)
      }
    } else {
      if (versionId === latestVersion?.id) {
        onViewVersion(null)
      } else {
        onViewVersion(versionId)
      }
    }
  }

  const toggleCompareMode = () => {
    if (compareMode) {
      closeDiff()
    } else {
      setCompareMode(true)
      setCompareFrom(null)
      setCompareTo(null)
      setShowDiff(false)
      setDiffData(null)
    }
  }

  if (versions.length <= 1) return null

  // Latest change description
  const latestChange = latestVersion?.changeDescription

  return (
    <div className="mb-1.5 shrink-0">
      {/* Recent change */}
      {latestChange && (
        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-muted-foreground">
          {latestVersion?.changedBy === "ai" ? (
            <Bot className="h-3 w-3 text-primary/60 shrink-0" />
          ) : (
            <User className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          )}
          <span className="truncate">{latestChange}</span>
        </div>
      )}

      {/* Version bar */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground shrink-0">
          <History className="h-3 w-3" />
          <span>{sorted.length} versions</span>
        </div>

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
              onClick={toggleCompareMode}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] transition-colors ${
                compareMode
                  ? "bg-blue-500/15 text-blue-500 ring-1 ring-blue-500/30 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={compareMode ? "Cancel compare" : "Select two versions to compare"}
            >
              <GitCompareArrows className="h-2.5 w-2.5" />
              {compareMode ? "Cancel" : "Diff"}
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
      {compareMode && !compareFrom && (
        <div className="mt-1.5 text-[10px] text-blue-500">
          Select first version to compare...
        </div>
      )}
      {compareMode && compareFrom && !compareTo && (
        <div className="mt-1.5 text-[10px] text-blue-500">
          Now select second version...
        </div>
      )}

      {/* Git-style diff viewer */}
      {showDiff && diffData && (
        <div className="mt-2 rounded-lg border border-border/50 overflow-hidden">
          {/* Diff header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
            <GitCompareArrows className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              v{diffData.from.versionNumber} → v{diffData.to.versionNumber}
            </span>
            <div className="flex items-center gap-3 ml-2 text-[10px] font-mono">
              {diffData.summary.modified > 0 && (
                <span className="text-yellow-500">~{diffData.summary.modified}</span>
              )}
              {diffData.summary.added > 0 && (
                <span className="text-green-500">+{diffData.summary.added}</span>
              )}
              {diffData.summary.removed > 0 && (
                <span className="text-red-500">-{diffData.summary.removed}</span>
              )}
            </div>
            <button
              onClick={closeDiff}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Diff body */}
          <div className="max-h-72 overflow-auto font-mono text-[11px] leading-5">
            {diffData.lines.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground text-center font-sans">
                No differences found
              </div>
            ) : (
              diffData.lines.map((line, li) => {
                const changedSet = new Set(line.changedCols)

                if (line.type === "modified") {
                  return (
                    <div key={`m-${line.rowIndex}`}>
                      {/* Old row (red) */}
                      <div className="flex bg-red-500/8 border-b border-red-500/10">
                        <span className="shrink-0 w-10 px-2 text-right text-red-400/60 select-none border-r border-red-500/10">
                          {line.rowIndex + 1}
                        </span>
                        <span className="shrink-0 w-5 text-center text-red-400 select-none">−</span>
                        <div className="flex-1 px-1 overflow-x-auto whitespace-nowrap">
                          {diffData.columns.map((col, ci) => {
                            const val = line.fromRow?.[col]
                            const isChanged = changedSet.has(col)
                            return (
                              <span key={ci}>
                                {ci > 0 && <span className="text-muted-foreground/20 mx-1">│</span>}
                                <span className="text-red-400/50 text-[9px]">{col}:</span>
                                <span className={isChanged ? "bg-red-500/20 text-red-300 rounded px-0.5" : "text-red-400/70"}>
                                  {val ?? <span className="text-muted-foreground/30 italic">null</span>}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      {/* New row (green) */}
                      <div className="flex bg-green-500/8 border-b border-green-500/10">
                        <span className="shrink-0 w-10 px-2 text-right text-green-400/60 select-none border-r border-green-500/10">
                          {line.rowIndex + 1}
                        </span>
                        <span className="shrink-0 w-5 text-center text-green-400 select-none">+</span>
                        <div className="flex-1 px-1 overflow-x-auto whitespace-nowrap">
                          {diffData.columns.map((col, ci) => {
                            const val = line.toRow?.[col]
                            const isChanged = changedSet.has(col)
                            return (
                              <span key={ci}>
                                {ci > 0 && <span className="text-muted-foreground/20 mx-1">│</span>}
                                <span className="text-green-400/50 text-[9px]">{col}:</span>
                                <span className={isChanged ? "bg-green-500/20 text-green-300 rounded px-0.5" : "text-green-400/70"}>
                                  {val ?? <span className="text-muted-foreground/30 italic">null</span>}
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                }

                if (line.type === "removed") {
                  return (
                    <div key={`r-${line.rowIndex}`} className="flex bg-red-500/8 border-b border-red-500/10">
                      <span className="shrink-0 w-10 px-2 text-right text-red-400/60 select-none border-r border-red-500/10">
                        {line.rowIndex + 1}
                      </span>
                      <span className="shrink-0 w-5 text-center text-red-400 select-none">−</span>
                      <div className="flex-1 px-1 overflow-x-auto whitespace-nowrap">
                        {diffData.columns.map((col, ci) => {
                          const val = line.fromRow?.[col]
                          return (
                            <span key={ci}>
                              {ci > 0 && <span className="text-muted-foreground/20 mx-1">│</span>}
                              <span className="text-red-400/50 text-[9px]">{col}:</span>
                              <span className="text-red-400/70">
                                {val ?? <span className="text-muted-foreground/30 italic">null</span>}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                if (line.type === "added") {
                  return (
                    <div key={`a-${line.rowIndex}`} className="flex bg-green-500/8 border-b border-green-500/10">
                      <span className="shrink-0 w-10 px-2 text-right text-green-400/60 select-none border-r border-green-500/10">
                        {line.rowIndex + 1}
                      </span>
                      <span className="shrink-0 w-5 text-center text-green-400 select-none">+</span>
                      <div className="flex-1 px-1 overflow-x-auto whitespace-nowrap">
                        {diffData.columns.map((col, ci) => {
                          const val = line.toRow?.[col]
                          return (
                            <span key={ci}>
                              {ci > 0 && <span className="text-muted-foreground/20 mx-1">│</span>}
                              <span className="text-green-400/50 text-[9px]">{col}:</span>
                              <span className="text-green-400/70">
                                {val ?? <span className="text-muted-foreground/30 italic">null</span>}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                return null
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
