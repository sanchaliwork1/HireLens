import Anthropic from "@anthropic-ai/sdk"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Override with CLAUDE_MODEL in your env if you want to pin a different snapshot.
export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5"

/**
 * Forces Claude to return JSON matching `inputSchema` by defining a single
 * tool and forcing tool_choice. This avoids "almost JSON" parsing problems
 * that show up when you just ask a model to "respond in JSON".
 */
export async function callStructured<T>({
  system,
  prompt,
  toolName,
  toolDescription,
  inputSchema,
}: {
  system: string
  prompt: string
  toolName: string
  toolDescription: string
  inputSchema: Record<string, any>
}): Promise<T> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
    tools: [
      {
        name: toolName,
        description: toolDescription,
        input_schema: inputSchema as any,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
  })

  const block = res.content.find((b) => b.type === "tool_use") as
    | { type: "tool_use"; input: unknown }
    | undefined

  if (!block) {
    throw new Error(`Model did not return structured output for tool "${toolName}"`)
  }

  return block.input as T
}
