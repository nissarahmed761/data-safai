import { streamText, stepCountIs, convertToModelMessages } from "ai"
import { openrouter } from "@/lib/agent/provider"
import {
  loadFileContext,
  loadProjectContext,
  buildSystemPrompt,
  estimateTokens,
} from "@/lib/agent/context"
import { createTools } from "@/lib/agent/tools"
import { getDbUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages, projectId, fileId, taggedFileIds } = await req.json()

  // No project/file context is okay — agent can still answer general questions

  // Load project-wide context (lightweight metadata for all files)
  const projectCtx = projectId
    ? await loadProjectContext(projectId)
    : null

  // Determine which files need full context (sample data loaded)
  const focusFileIds = new Set<string>()
  if (fileId) focusFileIds.add(fileId)
  if (taggedFileIds && Array.isArray(taggedFileIds)) {
    for (const id of taggedFileIds) focusFileIds.add(id)
  }

  // Load full context for focused files
  const focusedFilesRaw = await Promise.all(
    Array.from(focusFileIds).map((id) => loadFileContext(id))
  )
  const focusedFiles = focusedFilesRaw.filter(
    (f): f is NonNullable<typeof f> => f !== null
  )

  // Use the active file's context for tools (first focused file or fileId)
  const activeFileCtx = focusedFiles.find((f) => f!.fileId === fileId) ?? focusedFiles[0]
  const tools = activeFileCtx ? createTools(activeFileCtx) : {}

  const systemPrompt = buildSystemPrompt(projectCtx, focusedFiles, fileId)

  // Convert UIMessages (parts-based) from useChat to ModelMessages (content-based) for streamText
  const modelMessages = await convertToModelMessages(messages)

  const contextTokens = estimateTokens(systemPrompt)

  const result = streamText({
    model: openrouter.chat("openai/gpt-5-nano"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  })

  const response = result.toUIMessageStreamResponse()
  // Pass context estimation as a header
  response.headers.set("X-Context-Tokens", String(contextTokens))
  return response
}
