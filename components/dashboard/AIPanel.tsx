"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
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
  AtSign,
} from "lucide-react"
import Listbox, { useListboxKeyboard, type ListboxItem } from "@/components/ui/Listbox"

export interface ProjectFile {
  id: string
  name: string
}

interface AIPanelProps {
  fileId: string | null
  projectId: string | null
  projectFiles: ProjectFile[]
  onFileChanged?: () => void
}

const MAX_CONTEXT_TOKENS = 128_000 // model context window

export default function AIPanel({
  fileId,
  projectId,
  projectFiles,
  onFileChanged,
}: AIPanelProps) {
  const [input, setInput] = useState("")
  const [taggedFiles, setTaggedFiles] = useState<ProjectFile[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState("")
  const [mentionHighlight, setMentionHighlight] = useState(0)
  const [contextTokens, setContextTokens] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileIdRef = useRef(fileId)
  const projectIdRef = useRef(projectId)
  const taggedFileIdsRef = useRef<string[]>([])
  fileIdRef.current = fileId
  projectIdRef.current = projectId

  // Keep tagged file IDs ref in sync
  useEffect(() => {
    taggedFileIdsRef.current = taggedFiles.map((f) => f.id)
  }, [taggedFiles])

  // Clear tags when file/project changes
  useEffect(() => {
    setTaggedFiles([])
  }, [fileId, projectId])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          fileId: fileIdRef.current,
          projectId: projectIdRef.current,
          taggedFileIds: taggedFileIdsRef.current,
        }),
      }),
    []
  )

  const { messages, sendMessage, status } = useChat({ transport })

  const isLoading = status === "streaming" || status === "submitted"
  const hasContext = !!(fileId || projectId)

  // Estimate context from project file count + tagged files
  const estimatedContextTokens = useMemo(() => {
    if (!projectId) return 0
    // Base: ~200 tokens for instructions + per-file summary ~50 tokens each
    let tokens = 200 + projectFiles.length * 50
    // Tagged files: ~500 tokens each (sample data)
    tokens += taggedFiles.length * 500
    // Active file: ~500 tokens
    if (fileId) tokens += 500
    return tokens + contextTokens
  }, [projectId, projectFiles.length, taggedFiles.length, fileId, contextTokens])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, status])

  // Filtered files for @ mention dropdown
  const mentionCandidates = useMemo(() => {
    const taggedIds = new Set(taggedFiles.map((f) => f.id))
    return projectFiles
      .filter(
        (f) =>
          !taggedIds.has(f.id) &&
          f.name.toLowerCase().includes(mentionFilter.toLowerCase())
      )
      .map((f): ListboxItem => ({
        id: f.id,
        label: f.name.split("/").pop() || f.name,
        icon: <AtSign className="h-3 w-3 text-primary shrink-0" />,
      }))
  }, [projectFiles, taggedFiles, mentionFilter])

  const handleMentionSelect = useCallback(
    (item: ListboxItem) => {
      const file = projectFiles.find((f) => f.id === item.id)
      if (file) {
        setTaggedFiles((prev) => [...prev, file])
        const lastAt = input.lastIndexOf("@")
        const before = lastAt > 0 ? input.slice(0, lastAt) : ""
        setInput(before)
        setShowMentions(false)
        inputRef.current?.focus()
      }
    },
    [input, projectFiles]
  )

  const mentionKeyDown = useListboxKeyboard(
    mentionCandidates,
    mentionHighlight,
    setMentionHighlight,
    handleMentionSelect,
    () => setShowMentions(false),
    showMentions
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setInput(val)

      // Check for @ trigger
      const lastAt = val.lastIndexOf("@")
      if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
        const afterAt = val.slice(lastAt + 1)
        // Only show if no space after the @filter
        if (!afterAt.includes(" ")) {
          setMentionFilter(afterAt)
          setShowMentions(true)
          return
        }
      }
      setShowMentions(false)
    },
    []
  )

  const removeTag = useCallback((fileId: string) => {
    setTaggedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    // Include tagged file names in the message for clarity
    const tagPrefix = taggedFiles.length > 0
      ? taggedFiles.map((f) => `@${f.name}`).join(" ") + " "
      : ""
    sendMessage({ text: tagPrefix + input.trim() })
    setInput("")
    setTaggedFiles([])
  }

  const contextPercent = Math.min(
    100,
    Math.round((estimatedContextTokens / MAX_CONTEXT_TOKENS) * 100)
  )
  const contextColor =
    contextPercent > 80
      ? "text-destructive"
      : contextPercent > 50
        ? "text-yellow-500"
        : "text-muted-foreground"

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
        <div className="ml-auto flex items-center gap-2">
          {/* Context usage indicator */}
          {hasContext && (
            <span className={`text-[10px] font-mono ${contextColor}`} title={`~${estimatedContextTokens.toLocaleString()} / ${MAX_CONTEXT_TOKENS.toLocaleString()} tokens`}>
              ctx {contextPercent}%
            </span>
          )}
          <span className={`h-2 w-2 rounded-full ${hasContext ? "bg-primary" : "bg-muted-foreground/30"}`} />
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
              {hasContext
                ? "Ask me to analyze, clean, or transform your data. Use @ to tag files."
                : "Ask me anything. Select a file or use @ to give me data context."}
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
                    if (!part.text) return null
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

      {/* Tagged files pills */}
      {taggedFiles.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-t border-border/50 bg-muted/10 flex-wrap">
          <AtSign className="h-3 w-3 text-muted-foreground shrink-0" />
          {taggedFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => removeTag(f.id)}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
              title="Click to remove"
            >
              {f.name.split("/").pop()}
              <span className="text-primary/50">&times;</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative shrink-0">
        {/* @ Mention dropdown */}
        {showMentions && mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mx-4 mb-1 z-10">
            <Listbox
              items={mentionCandidates}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentions(false)}
            />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/20"
        >
          <span className="text-primary font-mono text-sm font-bold">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (showMentions) {
                mentionKeyDown(e)
              }
            }}
            placeholder="Ask AI... (type @ to tag files)"
            className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
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
