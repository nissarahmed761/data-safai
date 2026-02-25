# Data Safai — AI Agent Architecture Plan

## Overview

Data Safai is an AI-driven dataset cleaning platform. The AI is not a chatbot — it's a **tool-calling agent** that can analyze, clean, and transform CSV/JSON datasets. Every change creates a new file version with full diff tracking.

## Tech Stack

- **AI SDK v6+** (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`) — `ToolLoopAgent`, `streamText`, typed tools, `useChat`
- **OpenRouter** — LLM provider (via `@ai-sdk/openai` with custom `baseURL`)
- **Zod** — tool input schemas
- **Drizzle + Neon** — metadata, versions, conversations
- **Cloudflare R2** — file storage
- **Next.js** — API routes + React frontend

---

## Agent Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Client (AI Panel)                                           │
│                                                              │
│  useChat<AgentUIMessage>({                                   │
│    transport: new DefaultChatTransport({ api: '/api/chat' }) │
│  })                                                          │
│                                                              │
│  message.parts.map(part => {                                 │
│    case 'text'              → render markdown                │
│    case 'tool-profile_dataset'   → render stats card         │
│    case 'tool-remove_nulls'      → render diff summary       │
│    case 'tool-fill_values'       → render diff summary       │
│    ...                                                       │
│  })                                                          │
└──────────────┬───────────────────────────────────────────────┘
               │  POST /api/chat
┌──────────────▼───────────────────────────────────────────────┐
│  Server (app/api/chat/route.ts)                              │
│                                                              │
│  streamText({                                                │
│    model: openrouter("anthropic/claude-sonnet-4"),            │
│    system: buildSystemPrompt(fileContext),                    │
│    messages,                                                 │
│    tools: { ...allTools },                                   │
│    stopWhen: stepCountIs(5),                                 │
│  }).toUIMessageStreamResponse()                              │
│                                                              │
│  Tool execute functions:                                     │
│    1. Load CSV from R2                                       │
│    2. Mutate data in memory                                  │
│    3. Compute diff (old vs new)                              │
│    4. Save new version to R2 + DB                            │
│    5. Return { diff, version } as tool output                │
└──────────────────────────────────────────────────────────────┘
          │                    │
     R2 (file storage)    Neon DB (versions, conversations)
```

---

## AI SDK Integration (v6+ API)

### Provider Setup

```ts
// lib/agent/provider.ts
import { createOpenAI } from "@ai-sdk/openai"

export const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})
```

### Tool Definition (current API)

```ts
// lib/agent/tools/remove-nulls.ts
import { tool } from "ai"
import { z } from "zod"

export const removeNullsTool = tool({
  description: "Remove or fill null/empty values in a column",
  inputSchema: z.object({                          // NOT `parameters`
    column: z.string().describe("Column name"),
    strategy: z.enum(["drop_rows", "fill_mean", "fill_median", "fill_mode", "fill_constant"]),
    fillValue: z.string().optional().describe("Value when strategy is fill_constant"),
  }),
  execute: async ({ column, strategy, fillValue }) => {
    // mutate CSV, compute diff, save version
    return { diff: {...}, version: {...} }
  },
})
```

### Server Route

```ts
// app/api/chat/route.ts
import { streamText, stepCountIs } from "ai"

export async function POST(req: Request) {
  const { messages, fileId } = await req.json()
  const fileContext = await loadFileContext(fileId)

  const result = streamText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: buildSystemPrompt(fileContext),
    messages,
    tools: { ...allTools },
    stopWhen: stepCountIs(5),         // NOT `maxSteps`
  })

  return result.toUIMessageStreamResponse()   // NOT `toDataStreamResponse`
}
```

### Client Hook (current API)

```tsx
// components/dashboard/AIPanel.tsx
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useState } from "react"

const [input, setInput] = useState("")           // manual input state
const { messages, sendMessage } = useChat({      // NOT handleSubmit
  transport: new DefaultChatTransport({           // NOT `api: string`
    api: "/api/chat",
    body: { fileId },
  }),
})

// Send message
sendMessage({ text: input })                     // NOT handleSubmit
setInput("")
```

### Rendering Tool Parts (typed)

```tsx
message.parts.map((part, i) => {
  switch (part.type) {
    case "text":
      return <p key={i}>{part.text}</p>
    case "tool-profile_dataset":
      if (part.state === "output-available") {
        return <StatsCard key={i} stats={part.output} />  // part.output, NOT part.result
      }
      return <LoadingCard key={i} />
    case "tool-remove_nulls":
      if (part.state === "output-available") {
        return <DiffCard key={i} diff={part.output.diff} />
      }
      if (part.state === "input-available") {
        return <ToolRunning key={i} tool="remove_nulls" input={part.input} />
      }
      return null
  }
})
```

---

## Tool Registry

### File structure

```
lib/agent/
  provider.ts           — OpenRouter provider setup
  context.ts            — System prompt builder
  tools/
    index.ts            — Re-exports all tools
    profile-dataset.ts  — Read-only: full dataset profiling
    analyze-column.ts   — Read-only: single column deep dive
    remove-nulls.ts     — Fill/drop nulls
    remove-duplicates.ts — Dedup rows
    trim-whitespace.ts  — Clean whitespace
    normalize-case.ts   — Upper/lower/title case
    fix-types.ts        — Cast column types
    apply-regex.ts      — Regex find & replace
    rename-column.ts    — Rename column
    drop-column.ts      — Drop column
    filter-rows.ts      — Filter by condition
    sort-rows.ts        — Sort rows
    split-column.ts     — Split column by delimiter
    merge-columns.ts    — Merge columns
  diff.ts               — Diff engine
```

### Analysis Tools (read-only)

| Tool | inputSchema | Output |
|------|------------|--------|
| `profile_dataset` | `{}` | `{ rowCount, columnCount, columns: [{ name, type, nullCount, uniqueCount, min?, max?, mean? }] }` |
| `analyze_column` | `{ column: string }` | `{ name, type, nullCount, uniqueCount, topValues, distribution }` |

### Cleaning Tools (mutating)

| Tool | inputSchema | Output |
|------|------------|--------|
| `remove_nulls` | `{ column, strategy, fillValue? }` | `{ diff, version }` |
| `remove_duplicates` | `{ columns?: string[] }` | `{ diff, version }` |
| `trim_whitespace` | `{ columns?: string[] }` | `{ diff, version }` |
| `normalize_case` | `{ column, case: upper\|lower\|title }` | `{ diff, version }` |
| `fix_types` | `{ column, targetType }` | `{ diff, version }` |
| `apply_regex` | `{ column, pattern, replacement }` | `{ diff, version }` |

### Transform Tools (mutating)

| Tool | inputSchema | Output |
|------|------------|--------|
| `rename_column` | `{ oldName, newName }` | `{ diff, version }` |
| `drop_column` | `{ column }` | `{ diff, version }` |
| `filter_rows` | `{ column, operator, value }` | `{ diff, version }` |
| `sort_rows` | `{ column, direction }` | `{ diff, version }` |
| `split_column` | `{ column, delimiter, newColumns }` | `{ diff, version }` |
| `merge_columns` | `{ columns, separator, newColumn }` | `{ diff, version }` |

---

## Diff Engine

Every mutating tool returns a diff:

```ts
interface DiffResult {
  summary: string           // "Filled 23 nulls in 'email'"
  rowsModified: number
  rowsRemoved: number
  rowsAdded: number
  cellChanges: {            // first 50 cell changes for UI preview
    row: number
    column: string
    oldValue: string | null
    newValue: string | null
  }[]
}
```

### UI Highlighting
- **Green bg** — new/filled cells
- **Red strikethrough** — removed rows/cells
- **Yellow bg** — modified cells
- Tooltip: `"was: [old] → now: [new]"`

---

## Version Control

### Data Model (already in schema)
- `fileVersions` table: `versionNumber`, `storagePath` (R2), `rowCount`, `columnCount`, `columns`, `changeDescription`, `changedBy` (user|ai)

### UI: Version Timeline
```
v1 (upload) → v2 (filled nulls) → v3 (removed dupes) ← current
                                    [Revert] [Export]
```

### API Routes
- `GET /api/files/[fileId]/versions` — list versions
- `POST /api/files/[fileId]/versions/[versionId]/revert` — revert (creates new version)
- `GET /api/files/[fileId]/versions/[versionId]/export` — download CSV

---

## Implementation Phases

### Phase A: Core agent + 2 tools (profile + remove_nulls)
1. Install `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `zod`
2. `lib/agent/provider.ts` — OpenRouter config
3. `lib/agent/context.ts` — system prompt builder
4. `lib/agent/diff.ts` — diff engine
5. `lib/agent/tools/profile-dataset.ts` — read-only profiling
6. `lib/agent/tools/remove-nulls.ts` — first mutating tool
7. `lib/agent/tools/index.ts` — barrel export
8. `app/api/chat/route.ts` — streaming route with `streamText` + `toUIMessageStreamResponse`

### Phase B: AI Panel rewrite with useChat
1. Rewrite `components/dashboard/AIPanel.tsx` — `useChat` + `DefaultChatTransport`
2. Render text parts as markdown
3. Render tool parts inline (tool-{name} typed parts)
4. Show diff summaries from tool outputs
5. Wire file selection context to chat

### Phase C: Remaining tools
1. Add all cleaning tools (remove_duplicates, trim_whitespace, normalize_case, fix_types, apply_regex)
2. Add all transform tools (rename_column, drop_column, filter_rows, sort_rows, split_column, merge_columns)
3. Add analyze_column tool

### Phase D: Version control UI
1. Version timeline component
2. Revert + export API routes
3. Diff highlighting in table viewer

### Phase E: Polish
1. Conversation persistence in DB
2. Error handling + edge cases
3. Large file pagination in tools
