import { NextResponse } from 'next/server'
import { generateContractPDF } from '@/lib/pdf-template'
import { prisma } from '@/lib/db'
import type { ContractData } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 },
      )
    }

    const record = await prisma.onboarding.findUnique({ where: { token } })
    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 },
      )
    }

    const contract = record.contract as unknown as ContractData
    const pdfBytes = await generateContractPDF(contract)

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="contract.pdf"',
      },
    })
  } catch (error) {
    console.error('PDF generation (GET) failed:', error)
    return NextResponse.json(
      { success: false, error: 'PDF生成に失敗しました' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as ContractData

    if (!data.employeeName || !data.startDate || !data.salary) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 },
      )
    }

    const pdfBytes = await generateContractPDF(data)

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="contract.pdf"',
      },
    })
  } catch (error) {
    console.error('PDF generation failed:', error)
    return NextResponse.json(
      { success: false, error: 'PDF生成に失敗しました' },
      { status: 500 },
    )
  }
}
