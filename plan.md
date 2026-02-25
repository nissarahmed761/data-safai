# Data Safai — AI Agent Architecture Plan

## Overview

Data Safai is an AI-driven dataset cleaning platform. The AI is not a chatbot — it's a **tool-calling agent** that can analyze, clean, and transform CSV/JSON datasets. Every change creates a new file version with full diff tracking.

## Tech Stack

- **AI SDK** (`ai` package by Vercel) — agent orchestration, tool definitions, streaming
- **OpenRouter** — LLM provider (via AI SDK's OpenAI-compatible adapter)
- **Drizzle + Neon** — metadata, versions, conversations
- **Cloudflare R2** — file storage
- **Next.js** — API routes + React frontend

---

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (AI Panel)                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Chat stream  │  │ Diff viewer  │  │ Version timeline  │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────┼────────────────┼───────────────────┼──────────────┘
          │                │                   │
    POST /api/chat    (inline in response)    GET /api/files/[id]
          │
┌─────────▼───────────────────────────────────────────────────┐
│  Agent Orchestrator (AI SDK streamText + tools)             │
│                                                             │
│  1. Build context (schema + stats + sample rows)            │
│  2. Call OpenRouter with tool definitions via AI SDK        │
│  3. AI SDK handles tool call loop automatically             │
│  4. Execute tools → mutate CSV in memory                    │
│  5. Compute diff (old vs new)                               │
│  6. Save new version to R2 + DB                             │
│  7. Stream back: explanation + diff + new version info      │
│                                                             │
│  ┌──────────────────────────────────────────┐               │
│  │  Tool Registry (AI SDK `tool()`)         │               │
│  │  ├── profile_dataset                     │               │
│  │  ├── analyze_column                      │               │
│  │  ├── remove_nulls                        │               │
│  │  ├── fill_values                         │               │
│  │  ├── remove_duplicates                   │               │
│  │  ├── drop_column                         │               │
│  │  ├── rename_column                       │               │
│  │  ├── fix_types                           │               │
│  │  ├── filter_rows                         │               │
│  │  ├── sort_rows                           │               │
│  │  ├── transform_column                    │               │
│  │  ├── trim_whitespace                     │               │
│  │  ├── normalize_case                      │               │
│  │  ├── apply_regex                         │               │
│  │  ├── split_column                        │               │
│  │  └── merge_columns                       │               │
│  └──────────────────────────────────────────┘               │
│                                                             │
│  ┌──────────────────────────────────────────┐               │
│  │  Diff Engine                             │               │
│  │  - Row-level: added / removed / modified │               │
│  │  - Cell-level: old value → new value     │               │
│  │  - Summary: "Changed 23 cells in email"  │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
          │                    │
     R2 (file storage)    Neon DB (versions, conversations)
```

---

## AI SDK Integration

Using Vercel AI SDK's `streamText` with tool calling:

```ts
import { streamText, tool } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

const result = streamText({
  model: openrouter("anthropic/claude-sonnet-4"),
  system: buildSystemPrompt(fileContext),
  messages: conversationHistory,
  tools: {
    remove_nulls: tool({
      description: "Remove or fill null/empty values in a column",
      parameters: z.object({
        column: z.string().describe("Column name"),
        strategy: z.enum(["drop_rows", "fill_mean", "fill_median", "fill_mode", "fill_constant"]),
        fillValue: z.string().optional().describe("Value to fill with when strategy is fill_constant"),
      }),
      execute: async ({ column, strategy, fillValue }) => {
        // Mutate CSV data, compute diff, save version
      },
    }),
    // ... more tools
  },
  maxSteps: 5, // Allow multi-step agent reasoning
})
```

AI SDK handles the tool-call loop automatically — the LLM can call multiple tools in sequence, see results, and summarize.

---

## Tool Definitions

### Analysis Tools (read-only)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `profile_dataset` | — | Full dataset profile: row count, column types, null counts, unique counts, min/max/mean per numeric column |
| `analyze_column` | `column: string` | Deep dive on one column: distribution, top values, nulls, type inference |

### Cleaning Tools (mutating)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `remove_nulls` | `column, strategy` | Handle nulls: drop rows, fill with mean/median/mode/constant |
| `fill_values` | `column, strategy, value?` | Fill empty/null cells |
| `remove_duplicates` | `columns?: string[]` | Remove duplicate rows (optionally by subset of columns) |
| `trim_whitespace` | `columns?: string[]` | Trim leading/trailing whitespace |
| `normalize_case` | `column, case: upper\|lower\|title` | Normalize string casing |
| `fix_types` | `column, targetType: number\|string\|boolean\|date` | Cast column to target type |
| `apply_regex` | `column, pattern, replacement` | Regex find & replace |

### Transform Tools (mutating)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `rename_column` | `oldName, newName` | Rename a column |
| `drop_column` | `column` | Drop a column |
| `filter_rows` | `column, operator, value` | Filter rows by condition |
| `sort_rows` | `column, direction: asc\|desc` | Sort rows |
| `transform_column` | `column, expression` | Apply expression to column values |
| `split_column` | `column, delimiter, newColumns` | Split column into multiple |
| `merge_columns` | `columns, separator, newColumn` | Merge columns into one |

---

## Agent Response Format

The streaming response contains interleaved blocks parsed by the client:

```jsonl
{"type": "text", "content": "I found 23 null values in the email column..."}
{"type": "tool_call", "tool": "fill_values", "args": {"column": "email", "strategy": "constant", "value": "unknown"}}
{"type": "tool_result", "summary": "Filled 23 nulls in 'email' with 'unknown'"}
{"type": "diff", "changes": {"modified": 23, "removed": 0, "added": 0}, "cells": [...]}
{"type": "version", "versionNumber": 2, "description": "Filled nulls in email column"}
{"type": "text", "content": "Done. Version 2 created. The email column now has no nulls."}
```

---

## Diff Engine

### Row-level diff
- Compare old rows vs new rows by index
- Detect: added, removed, modified rows

### Cell-level diff
- For modified rows, compare each cell
- Track: `{row, column, oldValue, newValue}`

### Summary
- "Modified 23 cells in column 'email'"
- "Removed 5 duplicate rows"
- "Added column 'full_name'"

### UI Highlighting
- **Green background** — new/filled cells
- **Red strikethrough** — removed rows/cells
- **Yellow background** — modified cells
- Cell tooltip: `"was: [old] → now: [new]"`
- Toggle diff view on/off

---

## Version Control

### Data Model (already in schema)
- `fileVersions` table tracks every change
- Each version has: `versionNumber`, `storagePath` (R2), `rowCount`, `columnCount`, `columns`, `changeDescription`, `changedBy` (user|ai)

### UI: Version Timeline
Compact horizontal timeline below file header:
```
v1 (upload) → v2 (filled nulls) → v3 (removed dupes) ← current
```

### Actions
- **View** any version (click to load that version's data)
- **Compare** two versions (side-by-side or inline diff)
- **Revert** to a previous version (creates a new version, non-destructive)
- **Export** download CSV of any version

### API Routes
- `GET /api/files/[fileId]/versions` — list all versions
- `POST /api/files/[fileId]/versions/[versionId]/revert` — revert to version
- `GET /api/files/[fileId]/versions/[versionId]/export` — download CSV
- `GET /api/files/[fileId]/versions/compare?v1=X&v2=Y` — get diff

---

## Conversation Scoping

Each file gets its own conversation. The agent system prompt always includes:

```
File: {filename} ({rowCount} rows, {columnCount} columns)
Columns: {name (type)} for each column
Stats: null counts, unique counts, min/max/mean per column
Sample: first 20 rows as CSV
Current version: v{n}
```

Conversation history is persisted in DB (messages table) and loaded on file select.

---

## Implementation Phases

### Phase A: AI SDK + OpenRouter + Tool Engine
- Install `ai`, `@ai-sdk/openai`, `zod`
- Create `lib/agent/tools.ts` — all tool definitions with Zod schemas + execute functions
- Create `lib/agent/context.ts` — build system prompt from file data
- Create `app/api/chat/route.ts` — streaming endpoint using AI SDK `streamText`

### Phase B: Diff Engine
- Create `lib/agent/diff.ts` — compute row-level and cell-level diffs
- Integrate into tool execution: after mutation → compute diff → include in response

### Phase C: AI Panel Rewrite
- Streaming text display (AI SDK `useChat` hook)
- Render tool calls inline (show what the agent is doing)
- Render diffs inline (highlighted changes)
- Version bump notifications

### Phase D: Version Control UI
- Version timeline component below file header
- Compare view (side-by-side diff)
- Revert action
- Export/download button

### Phase E: Polish
- Error handling and edge cases
- Large file handling (pagination in tools)
- Rate limiting per user
- Keyboard shortcuts in AI panel
