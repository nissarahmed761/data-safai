import { streamText, stepCountIs } from "ai"
import { openrouter } from "@/lib/agent/provider"
import { loadFileContext, buildSystemPrompt } from "@/lib/agent/context"
import { createTools } from "@/lib/agent/tools"
import { getDbUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const user = await getDbUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messages, fileId } = await req.json()

  if (!fileId) {
    return NextResponse.json(
      { error: "fileId is required. Select a file to chat about." },
      { status: 400 }
    )
  }

  const fileContext = await loadFileContext(fileId)
  if (!fileContext) {
    return NextResponse.json(
      { error: "File not found or has no versions." },
      { status: 404 }
    )
  }

  const tools = createTools(fileContext)

  const result = streamText({
    model: openrouter("openai/gpt-5-nano"),
    system: buildSystemPrompt(fileContext),
    messages,
    tools,
    stopWhen: stepCountIs(5),
  })

  return result.toUIMessageStreamResponse()
}
