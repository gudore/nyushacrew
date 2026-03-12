import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const record = await prisma.onboarding.findUnique({ where: { token } })

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Failed to fetch onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'データの取得に失敗しました' },
      { status: 500 },
    )
  }
}

export async function PATCH(
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

    const updateData: Record<string, unknown> = {}
    if (body.personal !== undefined) {
      updateData.personal = JSON.parse(JSON.stringify(body.personal))
    }
    if (body.signature !== undefined) {
      updateData.signature = body.signature
    }
    if (body.documents !== undefined) {
      updateData.documents = JSON.parse(JSON.stringify(body.documents))
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }
    if (body.status === 'submitted') {
      updateData.submittedAt = new Date()
    }

    const updated = await prisma.onboarding.update({
      where: { token },
      data: updateData,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Failed to update onboarding:', error)
    return NextResponse.json(
      { success: false, error: '更新に失敗しました' },
      { status: 500 },
    )
  }
}
