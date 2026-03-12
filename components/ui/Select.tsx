"use client"

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react"
import { ChevronDown } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll("[data-option]")
    items[highlightedIndex]?.scrollIntoView({ block: "nearest" })
  }, [highlightedIndex, open])

  // Reset highlight when opening
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value)
      setHighlightedIndex(idx >= 0 ? idx : 0)
    }
  }, [open, options, value])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return

      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setOpen(true)
        }
        return
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1
          )
          break
        case "Enter":
        case " ":
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            onChange(options[highlightedIndex].value)
            setOpen(false)
          }
          break
        case "Escape":
          e.preventDefault()
          setOpen(false)
          break
        case "Tab":
          setOpen(false)
          break
      }
    },
    [open, disabled, highlightedIndex, options, onChange]
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? "ring-1 ring-primary" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedOption ? "text-foreground" : "text-muted-foreground/50"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No options
            </div>
          ) : (
            options.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                data-option
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                  i === highlightedIndex
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted/50"
                } ${opt.value === value ? "font-medium text-primary" : ""}`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
