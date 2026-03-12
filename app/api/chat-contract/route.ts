import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CONTRACT_CHAT_SUMMARY_PROMPT } from '@/lib/prompts'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contractData } = body

    if (!contractData) {
      return NextResponse.json(
        { success: false, error: '契約データが必要です' },
        { status: 400 }
      )
    }

    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: CONTRACT_CHAT_SUMMARY_PROMPT,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(contractData),
        },
      ],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('AI returned no text')
    }

    const raw = textBlock.text.replace(/```json\s*/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(raw)

    return NextResponse.json({
      success: true,
      summaryText: parsed.summaryText,
      warnings: parsed.warnings ?? [],
    })
  } catch (error) {
    console.error('Chat contract summary failed:', error)
    return NextResponse.json(
      { success: false, error: 'AI要約の生成に失敗しました' },
      { status: 500 }
    )
  }
}
