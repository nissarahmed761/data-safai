"use client"

import { useState, useRef, useEffect } from "react"
import { Terminal, Send, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "ai"
  content: string
}

export default function AIPanel() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Welcome to Data Safai AI. How can I help you clean your data?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setMessages((prev) => [...prev, { role: "user", content: userMsg }])
    setInput("")
    setIsLoading(true)

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Processing: "${userMsg}". Connect your AI backend to enable real data cleaning operations.`,
        },
      ])
      setIsLoading(false)
    }, 800)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <Terminal className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          AI Terminal
        </span>
        <div className="ml-auto flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/50" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/20" />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 font-mono text-[13px] leading-relaxed min-h-0"
      >
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <span
              className={`shrink-0 font-bold ${
                msg.role === "ai" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {msg.role === "ai" ? "›" : "$"}
            </span>
            <span
              className={
                msg.role === "ai" ? "text-foreground" : "text-muted-foreground"
              }
            >
              {msg.content}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold">›</span>
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
          placeholder="Ask AI to clean, transform, or analyze your data..."
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
  )
}
