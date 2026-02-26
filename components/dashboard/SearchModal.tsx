"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, FileSpreadsheet, X, CornerDownLeft } from "lucide-react"

interface SearchFile {
  id: string
  name: string
  projectName: string
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
  files: SearchFile[]
  onSelect: (fileId: string) => void
}

export default function SearchModal({
  open,
  onClose,
  files,
  onSelect,
}: SearchModalProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? files.filter(
        (f) =>
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.projectName.toLowerCase().includes(query.toLowerCase())
      )
    : files

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Clamp active index when results change
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.children[activeIndex] as HTMLElement
    if (active) active.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const handleSelect = useCallback(
    (fileId: string) => {
      onSelect(fileId)
      onClose()
    },
    [onSelect, onClose]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filtered[activeIndex]) {
        handleSelect(filtered[activeIndex].id)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActiveIndex(0)
            }}
            placeholder="Search files..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("")
                setActiveIndex(0)
                inputRef.current?.focus()
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Hint */}
        <div className="px-4 py-1.5 text-[10px] text-muted-foreground/70 border-b border-border/50">
          Tip: use ↑ ↓ to navigate, Enter to open.
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No files found
            </div>
          ) : (
            filtered.map((file, i) => (
              <button
                key={file.id}
                onClick={() => handleSelect(file.id)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 w-full px-4 py-2 text-left transition-colors ${
                  i === activeIndex
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">
                    {file.name.split("/").pop()}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {file.projectName}
                  </span>
                </div>
                {i === activeIndex && (
                  <CornerDownLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">↵</kbd>
            to select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">esc</kbd>
            to close
          </span>
          <span className="ml-auto flex items-center gap-0.5">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">⌘</kbd>
            <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">K</kbd>
          </span>
        </div>
      </div>
    </div>
  )
}
