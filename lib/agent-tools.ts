import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/types'
import type { ContractData } from '@/lib/types'

// ===== Default contract values =====
const CONTRACT_DEFAULTS: Partial<ContractData> = {
  department: 'front',
  employmentType: 'fulltime',
  salaryType: 'monthly',
  workHours: '9:00〜18:00',
  trialPeriod: '3ヶ月',
  paymentDate: '月末',
  workLocation: '本社',
  benefits: ['社会保険完備', '交通費支給'],
  position: 'スタッフ',
  employeeNameKana: '',
  startDate: new Date().toISOString().split('T')[0],
}

// ===== Tool definitions (Anthropic format) =====
export const AGENT_TOOLS = [
  {
    name: 'create_contract',
    description:
      '新しい雇用契約を作成し、オンボーディングレコードを生成します。従業員名、メールアドレス、給与は必須です。その他のフィールドはデフォルト値が適用されます。',
    input_schema: {
      type: 'object' as const,
      properties: {
        employeeName: { type: 'string', description: '従業員の氏名（漢字）' },
        employeeEmail: { type: 'string', description: '従業員のメールアドレス' },
        salary: { type: 'number', description: '給与額（円）' },
        employeeNameKana: { type: 'string', description: '従業員の氏名（フリガナ）' },
        position: { type: 'string', description: '役職・ポジション' },
        department: { type: 'string', description: '部署' },
        employmentType: {
          type: 'string',
          enum: ['fulltime', 'parttime', 'contract', 'dispatch'],
          description: '雇用形態',
        },
        salaryType: {
          type: 'string',
          enum: ['monthly', 'hourly', 'daily'],
          description: '給与タイプ',
        },
        startDate: { type: 'string', description: '入社日 (YYYY-MM-DD)' },
        endDate: { type: 'string', description: '契約終了日 (YYYY-MM-DD)' },
        workHours: { type: 'string', description: '勤務時間' },
        workLocation: { type: 'string', description: '勤務地' },
        trialPeriod: { type: 'string', description: '試用期間' },
        paymentDate: { type: 'string', description: '給与支払日' },
        benefits: { type: 'array', items: { type: 'string' }, description: '福利厚生' },
        specialConditions: { type: 'string', description: '特記事項' },
        employeePhone: { type: 'string', description: '電話番号' },
        weeklyHours: { type: 'string', description: '週間勤務時間' },
      },
      required: ['employeeName', 'employeeEmail', 'salary'],
    },
  },
  {
    name: 'list_onboardings',
    description: 'オンボーディングレコードの一覧を取得します。ステータスでフィルタリングできます。',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'submitted', 'reviewed', 'completed'],
          description: 'フィルタするステータス',
        },
        limit: { type: 'number', description: '取得件数（デフォルト: 10）' },
      },
      required: [],
    },
  },
  {
    name: 'get_onboarding',
    description: '指定トークンのオンボーディングレコードの詳細を取得します。',
    input_schema: {
      type: 'object' as const,
      properties: {
        token: { type: 'string', description: 'オンボーディングのトークン' },
      },
      required: ['token'],
    },
  },
  {
    name: 'update_status',
    description: 'オンボーディングレコードのステータスを更新します。',
    input_schema: {
      type: 'object' as const,
      properties: {
        token: { type: 'string', description: 'オンボーディングのトークン' },
        status: {
          type: 'string',
          enum: ['pending', 'in_progress', 'submitted', 'reviewed', 'completed'],
          description: '新しいステータス',
        },
      },
      required: ['token', 'status'],
    },
  },
  {
    name: 'generate_pdf_url',
    description: '指定トークンの契約書PDFダウンロードURLを生成します。',
    input_schema: {
      type: 'object' as const,
      properties: {
        token: { type: 'string', description: 'オンボーディングのトークン' },
      },
      required: ['token'],
    },
  },
  {
    name: 'export_csv_url',
    description: 'CSVエクスポートURLを生成します。トークン指定で単一レコード、省略で全件。',
    input_schema: {
      type: 'object' as const,
      properties: {
        token: { type: 'string', description: '特定レコードのトークン（省略可）' },
      },
      required: [],
    },
  },
  {
    name: 'get_dashboard_stats',
    description: 'ダッシュボードの統計情報（ステータス別件数）を取得します。',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
] as const

// ===== Tool executors =====
type ToolInput = Record<string, unknown>

async function executeCreateContract(input: ToolInput) {
  const token = generateToken()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const contractData: ContractData = {
    ...CONTRACT_DEFAULTS,
    employeeName: input.employeeName as string,
    employeeEmail: input.employeeEmail as string,
    salary: input.salary as number,
    employeeNameKana: (input.employeeNameKana as string) || '',
    position: (input.position as string) || CONTRACT_DEFAULTS.position!,
    department: (input.department as string) || CONTRACT_DEFAULTS.department!,
    employmentType: (input.employmentType as ContractData['employmentType']) || CONTRACT_DEFAULTS.employmentType!,
    salaryType: (input.salaryType as ContractData['salaryType']) || CONTRACT_DEFAULTS.salaryType!,
    startDate: (input.startDate as string) || CONTRACT_DEFAULTS.startDate!,
    workHours: (input.workHours as string) || CONTRACT_DEFAULTS.workHours!,
    workLocation: (input.workLocation as string) || CONTRACT_DEFAULTS.workLocation!,
    trialPeriod: (input.trialPeriod as string) || CONTRACT_DEFAULTS.trialPeriod!,
    paymentDate: (input.paymentDate as string) || CONTRACT_DEFAULTS.paymentDate!,
    benefits: (input.benefits as string[]) || CONTRACT_DEFAULTS.benefits!,
  }

  if (input.endDate) contractData.endDate = input.endDate as string
  if (input.specialConditions) contractData.specialConditions = input.specialConditions as string
  if (input.employeePhone) contractData.employeePhone = input.employeePhone as string
  if (input.weeklyHours) contractData.weeklyHours = input.weeklyHours as string

  await prisma.onboarding.create({
    data: {
      token,
      status: 'pending',
      contract: JSON.parse(JSON.stringify(contractData)),
    },
  })

  return {
    token,
    onboardingUrl: `${appUrl}/onboard/${token}`,
    employeeName: contractData.employeeName,
    salary: contractData.salary,
    salaryType: contractData.salaryType,
    position: contractData.position,
    startDate: contractData.startDate,
  }
}

async function executeListOnboardings(input: ToolInput) {
  const limit = (input.limit as number) || 10
  const where = input.status ? { status: input.status as string } : {}

  const records = await prisma.onboarding.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return {
    count: records.length,
    records: records.map((r) => {
      const contract = r.contract as Record<string, unknown>
      return {
        token: r.token,
        status: r.status,
        employeeName: contract?.employeeName || '—',
        position: contract?.position || '—',
        createdAt: r.createdAt.toISOString(),
        submittedAt: r.submittedAt?.toISOString() || null,
      }
    }),
  }
}

async function executeGetOnboarding(input: ToolInput) {
  const record = await prisma.onboarding.findUnique({
    where: { token: input.token as string },
  })

  if (!record) {
    throw new Error('指定されたトークンのレコードが見つかりません')
  }

  const contract = record.contract as Record<string, unknown>
  return {
    token: record.token,
    status: record.status,
    contract,
    hasPersonalData: !!record.personal,
    hasDocuments: !!record.documents,
    hasSigned: !!record.signature,
    aiReview: record.aiReview,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    submittedAt: record.submittedAt?.toISOString() || null,
  }
}

async function executeUpdateStatus(input: ToolInput) {
  const record = await prisma.onboarding.update({
    where: { token: input.token as string },
    data: { status: input.status as string },
  })

  const contract = record.contract as Record<string, unknown>
  return {
    token: record.token,
    status: record.status,
    employeeName: contract?.employeeName || '—',
  }
}

async function executeGeneratePdfUrl(input: ToolInput) {
  const record = await prisma.onboarding.findUnique({
    where: { token: input.token as string },
  })

  if (!record) {
    throw new Error('指定されたトークンのレコードが見つかりません')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return {
    pdfUrl: `${appUrl}/api/generate-contract?token=${input.token}`,
    employeeName: (record.contract as Record<string, unknown>)?.employeeName || '—',
  }
}

async function executeExportCsvUrl(input: ToolInput) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const tokenParam = input.token ? `?token=${input.token}` : ''
  return {
    csvUrl: `${appUrl}/api/export-csv${tokenParam}`,
    scope: input.token ? '単一レコード' : '全件',
  }
}

async function executeGetDashboardStats() {
  const records = await prisma.onboarding.findMany({
    select: { status: true },
  })

  const stats: Record<string, number> = {
    pending: 0,
    in_progress: 0,
    submitted: 0,
    reviewed: 0,
    completed: 0,
  }

  for (const r of records) {
    stats[r.status] = (stats[r.status] || 0) + 1
  }

  return {
    total: records.length,
    ...stats,
  }
}

// ===== Executor map =====
const executors: Record<string, (input: ToolInput) => Promise<Record<string, unknown>>> = {
  create_contract: executeCreateContract,
  list_onboardings: executeListOnboardings,
  get_onboarding: executeGetOnboarding,
  update_status: executeUpdateStatus,
  generate_pdf_url: executeGeneratePdfUrl,
  export_csv_url: executeExportCsvUrl,
  get_dashboard_stats: executeGetDashboardStats,
}

export async function executeTool(
  name: string,
  input: ToolInput
): Promise<Record<string, unknown>> {
  const executor = executors[name]
  if (!executor) {
    throw new Error(`Unknown tool: ${name}`)
  }
  return executor(input)
}
