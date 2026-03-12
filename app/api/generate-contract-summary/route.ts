import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CONTRACT_SUMMARY_PROMPT } from '@/lib/prompts'

const anthropic = new Anthropic()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contract } = body

    if (!contract) {
      return NextResponse.json(
        { success: false, error: 'Contract data is required' },
        { status: 400 },
      )
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${CONTRACT_SUMMARY_PROMPT}\n\n${JSON.stringify(contract)}`,
        },
      ],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { success: false, error: 'No response from AI' },
        { status: 500 },
      )
    }

    // Strip markdown fences if present
    const raw = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const bullets = JSON.parse(raw) as string[]

    return NextResponse.json({ success: true, data: bullets })
  } catch (error) {
    console.error('Contract summary generation failed:', error)
    return NextResponse.json(
      { success: false, error: '契約要約の生成に失敗しました' },
      { status: 500 },
    )
  }
}
