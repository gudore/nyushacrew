import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { uploadDocument } from '@/lib/cloudinary'
import { DOCUMENT_OCR_PROMPT } from '@/lib/prompts'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim()
}

export async function POST(request: Request) {
  try {
    const { imageBase64, documentType } = (await request.json()) as {
      imageBase64: string
      documentType: string
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: '画像データが必要です' },
        { status: 400 },
      )
    }

    // Upload to Cloudinary
    let cloudinaryUrl: string | null = null
    try {
      cloudinaryUrl = await uploadDocument(imageBase64, 'documents')
    } catch (err) {
      console.error('Cloudinary upload failed:', err)
      // Continue without Cloudinary — OCR can still work
    }

    // Strip data URL prefix if present to get raw base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // Detect media type from data URL or default to jpeg
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
    const mediaMatch = imageBase64.match(/^data:(image\/\w+);base64,/)
    if (mediaMatch) {
      const detected = mediaMatch[1]
      if (
        detected === 'image/png' ||
        detected === 'image/gif' ||
        detected === 'image/webp' ||
        detected === 'image/jpeg'
      ) {
        mediaType = detected
      }
    }

    // Call Claude vision API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: DOCUMENT_OCR_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `この${documentType}からデータを抽出してください。`,
            },
          ],
        },
      ],
    })

    // Extract text content from response
    const textBlock = message.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text in Claude response')
    }

    const cleaned = stripMarkdownFences(textBlock.text)
    const extractedData = JSON.parse(cleaned)

    return NextResponse.json({
      success: true,
      extractedData,
      cloudinaryUrl,
    })
  } catch (error) {
    console.error('OCR failed:', error)
    return NextResponse.json({
      success: false,
      extractedData: null,
      error: 'OCR処理に失敗しました',
      cloudinaryUrl: null,
    })
  }
}
