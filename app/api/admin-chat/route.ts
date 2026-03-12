import Anthropic from '@anthropic-ai/sdk'
import { ADMIN_AGENT_SYSTEM_PROMPT } from '@/lib/prompts'
import { AGENT_TOOLS, executeTool } from '@/lib/agent-tools'

const client = new Anthropic()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | Anthropic.ContentBlock[]
}

export async function POST(request: Request) {
  try {
    const { messages: userMessages } = (await request.json()) as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!userMessages || userMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'メッセージが必要です' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(event: Record<string, unknown>) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        try {
          // Build message history for the agentic loop
          const conversationMessages: ChatMessage[] = userMessages.map((m) => ({
            role: m.role,
            content: m.content,
          }))

          // Agentic loop: keep calling Claude until end_turn
          let continueLoop = true
          while (continueLoop) {
            const response = await client.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              system: ADMIN_AGENT_SYSTEM_PROMPT,
              tools: AGENT_TOOLS as unknown as Anthropic.Tool[],
              messages: conversationMessages as Anthropic.MessageParam[],
            })

            // Process response content blocks
            const assistantContent: Anthropic.ContentBlock[] = []

            for (const block of response.content) {
              if (block.type === 'text') {
                sendEvent({ type: 'text_delta', text: block.text })
                assistantContent.push(block)
              } else if (block.type === 'tool_use') {
                assistantContent.push(block)
                sendEvent({
                  type: 'tool_start',
                  toolCallId: block.id,
                  name: block.name,
                  input: block.input,
                })

                // Execute tool
                let toolResult: Record<string, unknown>
                let isError = false
                try {
                  toolResult = await executeTool(
                    block.name,
                    block.input as Record<string, unknown>
                  )
                } catch (err) {
                  isError = true
                  toolResult = {
                    error: err instanceof Error ? err.message : 'ツール実行エラー',
                  }
                }

                sendEvent({
                  type: 'tool_result',
                  toolCallId: block.id,
                  name: block.name,
                  result: toolResult,
                  ...(isError ? { error: toolResult.error } : {}),
                })

                // Add assistant message + tool result to conversation for next loop
                conversationMessages.push({
                  role: 'assistant',
                  content: assistantContent.slice(),
                })
                conversationMessages.push({
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: block.id,
                      content: JSON.stringify(toolResult),
                      is_error: isError,
                    },
                  ] as unknown as Anthropic.ContentBlock[],
                })
              }
            }

            // Check if we should continue the loop
            if (response.stop_reason === 'end_turn') {
              continueLoop = false
            } else if (response.stop_reason === 'tool_use') {
              // Continue loop — Claude wants to process tool results
              // assistantContent and tool results already pushed above
              continue
            } else {
              continueLoop = false
            }
          }

          sendEvent({ type: 'done' })
        } catch (err) {
          sendEvent({
            type: 'error',
            error: err instanceof Error ? err.message : 'チャットエラー',
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'リクエスト処理に失敗しました' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
