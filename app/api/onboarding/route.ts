import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const records = await prisma.onboarding.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: records })
  } catch (error) {
    console.error('Failed to fetch onboarding records:', error)
    return NextResponse.json(
      { success: false, error: 'データの取得に失敗しました' },
      { status: 500 },
    )
  }
}
