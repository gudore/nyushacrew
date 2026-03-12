import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { ContractData, PersonalData, FamilyMember } from '@/lib/types'

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatAddress(addr: PersonalData['address'] | undefined): string {
  if (!addr) return ''
  if (typeof addr === 'string') return addr
  return [addr.postalCode, addr.prefecture, addr.city, addr.street, addr.building]
    .filter(Boolean)
    .join(' ')
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenParam = searchParams.get('token')

    let records
    if (tokenParam) {
      const single = await prisma.onboarding.findUnique({ where: { token: tokenParam } })
      records = single ? [single] : []
    } else {
      records = await prisma.onboarding.findMany({
        where: { status: { in: ['submitted', 'reviewed', 'completed', 'approved'] } },
        orderBy: { createdAt: 'desc' },
      })
    }

    const headers = [
      'トークン/token',
      '氏名/name',
      '生年月日/birthDate',
      '住所/address',
      '国籍/nationality',
      '在留資格/visaStatus',
      '在留期限/visaExpiry',
      '雇用形態/employmentType',
      '役職/position',
      '給与/salary',
      '入社日/startDate',
      '退社日/endDate',
      '通勤手段/commuteMethod',
      '月額交通費/monthlyCommuteFare',
      '緊急連絡先氏名/emergencyName',
      '緊急連絡先電話/emergencyPhone',
      '家族人数/familyCount',
      'ステータス/status',
      '提出日/submittedAt',
    ]

    const rows = records.map((r) => {
      const c = r.contract as unknown as ContractData | null
      const p = r.personal as unknown as Record<string, unknown> | null

      const name = c?.employeeName || ''
      const birthDate = (p?.birthDate as string) || (p?.dateOfBirth as string) || ''
      const addr = p?.address as PersonalData['address'] | undefined
      const nationality = (p?.nationality as string) || ''
      const visaStatus = (p?.visaStatus as string) || ''
      const visaExpiry = (p?.visaExpiry as string) || ''
      const empType = c?.employmentType || ''
      const position = c?.position || ''
      const salary = c?.salary != null ? String(c.salary) : ''
      const startDate = c?.startDate || ''
      const endDate = c?.endDate || ''

      const commute = p?.commute as PersonalData['commute'] | undefined
      const commuteMethod = (p?.commuteMethod as string) || commute?.method || ''
      const monthlyCost = (p?.monthlyCost as number) ?? commute?.monthlyCost ?? ''

      const ec = p?.emergencyContact as PersonalData['emergencyContact'] | undefined
      const emergencyName = ec?.name || ''
      const emergencyPhone = ec?.phone || ''

      const family = (p?.familyMembers ?? p?.family ?? []) as FamilyMember[]
      const familyCount = String(family.length)

      return [
        r.token,
        name,
        birthDate,
        formatAddress(addr),
        nationality,
        visaStatus,
        visaExpiry,
        empType,
        position,
        salary,
        startDate,
        endDate,
        commuteMethod,
        String(monthlyCost),
        emergencyName,
        emergencyPhone,
        familyCount,
        r.status,
        formatDate(r.submittedAt),
      ].map((v) => csvEscape(String(v)))
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

    return new NextResponse(`\uFEFF${csvContent}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="employees_${dateStr}.csv"`,
      },
    })
  } catch (error) {
    console.error('CSV export failed:', error)
    return NextResponse.json(
      { success: false, error: 'CSVエクスポートに失敗しました' },
      { status: 500 },
    )
  }
}
