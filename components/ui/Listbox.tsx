"use client"

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ReactNode,
} from "react"

export interface ListboxItem {
  id: string
  label: string
  icon?: ReactNode
}

interface ListboxProps {
  items: ListboxItem[]
  onSelect: (item: ListboxItem) => void
  onClose: () => void
  maxVisible?: number
  className?: string
}

/**
 * A floating listbox with keyboard navigation.
 * Designed to be rendered inside a relative container positioned above/below an input.
 */
export default function Listbox({
  items,
  onSelect,
  onClose,
  maxVisible = 8,
  className = "",
}: ListboxProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset highlight when items change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [items])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || highlightedIndex < 0) return
    const el = listRef.current.querySelectorAll("[data-listbox-item]")
    el[highlightedIndex]?.scrollIntoView({ block: "nearest" })
  }, [highlightedIndex])

  const visible = items.slice(0, maxVisible)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < visible.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : visible.length - 1
          )
          break
        case "Enter":
        case "Tab":
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < visible.length) {
            onSelect(visible[highlightedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [visible, highlightedIndex, onSelect, onClose]
  )

  if (visible.length === 0) return null

  return (
    <div
      ref={listRef}
      role="listbox"
      onKeyDown={handleKeyDown}
      className={`rounded-lg border border-border bg-popover shadow-lg max-h-48 overflow-y-auto ${className}`}
    >
      {visible.map((item, i) => (
        <button
          key={item.id}
          type="button"
          data-listbox-item
          role="option"
          aria-selected={i === highlightedIndex}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setHighlightedIndex(i)}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
            i === highlightedIndex
              ? "bg-muted text-foreground"
              : "text-foreground hover:bg-muted/50"
          }`}
        >
          {item.icon}
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Hook to handle keyboard events for a Listbox from a parent input.
 * Returns a keydown handler to attach to the input element.
 */
export function useListboxKeyboard(
  items: ListboxItem[],
  highlightedIndex: number,
  setHighlightedIndex: (fn: (prev: number) => number) => void,
  onSelect: (item: ListboxItem) => void,
  onClose: () => void,
  isOpen: boolean,
  maxVisible = 8
) {
  const visible = items.slice(0, maxVisible)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < visible.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : visible.length - 1
          )
          break
        case "Enter":
          if (visible.length > 0) {
            e.preventDefault()
            const idx = Math.max(0, Math.min(highlightedIndex, visible.length - 1))
            onSelect(visible[idx])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [isOpen, visible, highlightedIndex, setHighlightedIndex, onSelect, onClose]
  )

  return handleKeyDown
}
