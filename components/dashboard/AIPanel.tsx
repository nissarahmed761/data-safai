"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai"
import {
  Terminal,
  Send,
  Loader2,
  BarChart3,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react"

interface AIPanelProps {
  fileId: string | null
  onFileChanged?: () => void
}

export default function AIPanel({ fileId, onFileChanged }: AIPanelProps) {
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { fileId },
    }),
  })

  const isLoading = status === "streaming" || status === "submitted"

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !fileId) return
    sendMessage({ text: input.trim() })
    setInput("")
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <Terminal className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          AI Agent
        </span>
        {isLoading && (
          <span className="flex items-center gap-1 text-[10px] text-primary">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            thinking
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <span className={`h-2 w-2 rounded-full ${fileId ? "bg-primary" : "bg-muted-foreground/30"}`} />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[13px] leading-relaxed min-h-0"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="h-5 w-5 text-primary/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {fileId
                ? "Ask me to analyze, clean, or transform your data."
                : "Select a file to start using the AI agent."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1.5">
            {msg.role === "user" ? (
              <div className="flex gap-2">
                <span className="shrink-0 font-bold font-mono text-muted-foreground">
                  $
                </span>
                <span className="text-muted-foreground font-mono">
                  {msg.parts
                    .filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("")}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {msg.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <div key={`${msg.id}-${i}`} className="flex gap-2">
                        <span className="shrink-0 font-bold font-mono text-primary">
                          ›
                        </span>
                        <span className="text-foreground whitespace-pre-wrap">
                          {part.text}
                        </span>
                      </div>
                    )
                  }

                  // Handle all tool parts generically
                  if (isToolUIPart(part)) {
                    const toolName = getToolName(part)
                    return (
                      <ToolPartRenderer
                        key={`${msg.id}-${i}`}
                        toolName={toolName}
                        state={part.state}
                        toolCallId={part.toolCallId}
                        input={(part as Record<string, unknown>).input}
                        output={(part as Record<string, unknown>).output}
                        onFileChanged={onFileChanged}
                      />
                    )
                  }

                  return null
                })}
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isLoading && messages.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold font-mono">›</span>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/20 shrink-0"
      >
        <span className="text-primary font-mono text-sm font-bold">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            fileId
              ? "Ask AI to clean, transform, or analyze your data..."
              : "Select a file first..."
          }
          className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
          disabled={isLoading || !fileId}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || !fileId}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}

/**
 * Generic tool part renderer — handles any tool type.
 */
function ToolPartRenderer({
  toolName,
  state,
  toolCallId,
  input,
  output,
  onFileChanged,
}: {
  toolName: string
  state: string
  toolCallId: string
  input?: unknown
  output?: unknown
  onFileChanged?: () => void
}) {
  const isProfile = toolName === "profile_dataset"
  const isMutating = !isProfile

  // Streaming / executing state
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="ml-4 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        <Wrench className="h-3 w-3 text-muted-foreground" />
        <span className="text-muted-foreground">
          Running <span className="font-mono font-medium text-foreground">{toolName}</span>...
        </span>
      </div>
    )
  }

  // Completed
  if (state === "output-available") {
    const out = output as Record<string, unknown>

    // Handle errors
    if (out?.error) {
      return (
        <div className="ml-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs">
          <AlertCircle className="h-3 w-3 text-destructive" />
          <span className="text-destructive">{String(out.error)}</span>
        </div>
      )
    }

    // Profile dataset result
    if (isProfile && out?.columns) {
      const columns = out.columns as Array<{
        name: string
        type: string
        nullCount: number
        uniqueCount: number
        min?: number
        max?: number
        mean?: number
      }>
      return (
        <div className="ml-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-medium">
            <BarChart3 className="h-3 w-3" />
            Dataset Profile — {String(out.rowCount)} rows, {String(out.columnCount)} cols
          </div>
          <div className="grid gap-1">
            {columns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <span className="font-mono text-foreground min-w-[100px] truncate">
                  {col.name}
                </span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                  {col.type}
                </span>
                {col.nullCount > 0 && (
                  <span className="text-destructive">
                    {col.nullCount} nulls
                  </span>
                )}
                <span>{col.uniqueCount} unique</span>
                {col.mean !== undefined && (
                  <span>μ={col.mean}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    // Mutating tool result (diff)
    if (isMutating && out?.diff) {
      const diff = out.diff as {
        summary: string
        rowsModified: number
        rowsRemoved: number
        rowsAdded: number
        cellChanges: { row: number; column: string; oldValue: string | null; newValue: string | null }[]
      }
      const version = out.version as {
        versionNumber: number
        changeDescription: string
      }

      // Notify parent to refresh file data
      if (onFileChanged) {
        setTimeout(onFileChanged, 100)
      }

      return (
        <div className="ml-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-medium">
            <CheckCircle2 className="h-3 w-3" />
            {diff.summary}
          </div>
          {version && (
            <div className="text-muted-foreground">
              → Version v{version.versionNumber} created
            </div>
          )}
          {diff.cellChanges.length > 0 && (
            <div className="mt-1 max-h-20 overflow-y-auto space-y-0.5">
              {diff.cellChanges.slice(0, 10).map((c, j) => (
                <div key={j} className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <span>row {c.row}</span>
                  <span className="text-foreground">{c.column}:</span>
                  <span className="line-through text-destructive/60">
                    {c.oldValue ?? "null"}
                  </span>
                  <span>→</span>
                  <span className="text-primary">
                    {c.newValue ?? "null"}
                  </span>
                </div>
              ))}
              {diff.cellChanges.length > 10 && (
                <span className="text-[10px] text-muted-foreground">
                  ...and {diff.cellChanges.length - 10} more changes
                </span>
              )}
            </div>
          )}
        </div>
      )
    }

    // Generic fallback for other tool outputs
    return (
      <div className="ml-4 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs">
        <CheckCircle2 className="h-3 w-3 text-primary" />
        <span className="font-mono text-foreground">{toolName}</span>
        <span className="text-muted-foreground">completed</span>
      </div>
    )
  }

  return null
}
