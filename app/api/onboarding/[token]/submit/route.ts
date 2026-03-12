import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const body = await request.json()

    const record = await prisma.onboarding.findUnique({ where: { token } })
    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 },
      )
    }

    if (record.status === 'submitted' || record.status === 'reviewed' || record.status === 'completed') {
      return NextResponse.json(
        { success: false, error: '既に提出済みです' },
        { status: 400 },
      )
    }

    // Run AI validation
    let aiReview = null
    try {
      const fullData = {
        contract: record.contract,
        personal: body.personal ?? record.personal,
        documents: record.documents,
        signature: record.signature,
      }

      const validateRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/validate-data`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullData),
        },
      )
      const validateJson = await validateRes.json()
      if (validateJson.success && validateJson.data) {
        aiReview = validateJson.data
      }
    } catch (validationError) {
      // Validation failure is non-blocking — we still submit
      console.error('AI validation failed (non-blocking):', validationError)
    }

    // Update record
    const updateData: Record<string, unknown> = {
      status: 'submitted',
      submittedAt: new Date(),
    }

    if (body.personal) {
      updateData.personal = JSON.parse(JSON.stringify(body.personal))
    }

    if (aiReview) {
      updateData.aiReview = JSON.parse(JSON.stringify(aiReview))
    }

    await prisma.onboarding.update({
      where: { token },
      data: updateData,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit failed:', error)
    return NextResponse.json(
      { success: false, error: '送信に失敗しました' },
      { status: 500 },
    )
  }
}
