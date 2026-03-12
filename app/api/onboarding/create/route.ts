import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/types'
import type { ContractData } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const body = await request.json() as ContractData

    if (!body.employeeName || !body.employeeEmail || !body.startDate || !body.salary) {
      return NextResponse.json(
        { success: false, error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    const token = generateToken()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    await prisma.onboarding.create({
      data: {
        token,
        status: 'pending',
        contract: JSON.parse(JSON.stringify(body)),
      },
    })

    return NextResponse.json({
      success: true,
      token,
      onboardingUrl: `${appUrl}/onboard/${token}`,
    })
  } catch (error) {
    console.error('Failed to create onboarding:', error)
    return NextResponse.json(
      { success: false, error: 'オンボーディングの作成に失敗しました' },
      { status: 500 }
    )
  }
}
