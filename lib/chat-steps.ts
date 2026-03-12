// ===== Chat Step Definitions for Contract Creation =====

export interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  ui?: {
    type: 'options' | 'text' | 'date' | 'number' | 'confirm' | 'success'
    options?: Array<{ value: string; label: string; icon?: string }>
    allowCustom?: boolean
    placeholder?: string
    prefix?: string
    field?: string
    inputType?: string
  }
}

export interface ChatStep {
  id: string
  field: string
  message: string
  ui: ChatMessage['ui']
  /** Return true to skip this step */
  skipIf?: (data: Record<string, string>) => boolean
  /** Transform user input before storing */
  transform?: (value: string) => string
  /** Validate user input — return error message or null */
  validate?: (value: string) => string | null
}

// Display labels for stored values
export const DISPLAY_LABELS: Record<string, Record<string, string>> = {
  department: {
    front: 'フロント',
    kitchen: 'キッチン',
    management: '管理',
    other: 'その他',
  },
  employmentType: {
    fulltime: '正社員',
    parttime: 'パート・アルバイト',
    contract: '契約社員',
    dispatch: '派遣社員',
  },
  salaryType: {
    monthly: '月給',
    hourly: '時給',
    daily: '日給',
  },
}

export function getDisplayLabel(field: string, value: string): string {
  return DISPLAY_LABELS[field]?.[value] ?? value
}

export const CHAT_STEPS: ChatStep[] = [
  // 1. Greeting (auto-advance — no field)
  {
    id: 'greeting',
    field: '__greeting',
    message: 'こんにちは！新しい契約書を作成しましょう。\nまず、従業員の情報から伺います。',
    ui: undefined,
  },

  // 2. employeeName
  {
    id: 'employeeName',
    field: 'employeeName',
    message: '従業員の氏名を入力してください。\n(Full name)',
    ui: {
      type: 'text',
      placeholder: '山田 太郎',
      field: 'employeeName',
    },
    validate: (v) => (!v.trim() ? '氏名を入力してください' : null),
  },

  // 3. employeeNameKana
  {
    id: 'employeeNameKana',
    field: 'employeeNameKana',
    message: 'フリガナを入力してください。\n(Name in Katakana)',
    ui: {
      type: 'text',
      placeholder: 'ヤマダ タロウ',
      field: 'employeeNameKana',
    },
    validate: (v) => (!v.trim() ? 'フリガナを入力してください' : null),
  },

  // 4. employeeEmail
  {
    id: 'employeeEmail',
    field: 'employeeEmail',
    message: 'メールアドレスを入力してください。\n(Email address)',
    ui: {
      type: 'text',
      placeholder: 'taro@example.com',
      inputType: 'email',
      field: 'employeeEmail',
    },
    validate: (v) => {
      if (!v.trim()) return 'メールアドレスを入力してください'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return '有効なメールアドレスを入力してください'
      return null
    },
  },

  // 5. employeePhone (skippable)
  {
    id: 'employeePhone',
    field: 'employeePhone',
    message: '電話番号を入力してください。（任意）\nスキップする場合は空欄のまま送信できます。\n(Phone number — optional)',
    ui: {
      type: 'text',
      placeholder: '090-1234-5678',
      field: 'employeePhone',
    },
  },

  // 6. position
  {
    id: 'position',
    field: 'position',
    message: '役職・ポジションを入力してください。\n(Position)',
    ui: {
      type: 'options',
      options: [
        { value: '店長', label: '店長' },
        { value: 'ホールスタッフ', label: 'ホールスタッフ' },
        { value: 'キッチンスタッフ', label: 'キッチンスタッフ' },
        { value: 'バリスタ', label: 'バリスタ' },
        { value: 'マネージャー', label: 'マネージャー' },
      ],
      allowCustom: true,
      placeholder: 'その他の役職を入力...',
      field: 'position',
    },
    validate: (v) => (!v.trim() ? '役職を入力してください' : null),
  },

  // 7. department
  {
    id: 'department',
    field: 'department',
    message: '配属部門を選択してください。\n(Department)',
    ui: {
      type: 'options',
      options: [
        { value: 'front', label: 'フロント', icon: '🏨' },
        { value: 'kitchen', label: 'キッチン', icon: '👨‍🍳' },
        { value: 'management', label: '管理', icon: '📊' },
        { value: 'other', label: 'その他', icon: '💼' },
      ],
      allowCustom: false,
      field: 'department',
    },
    validate: (v) => (!v ? '部門を選択してください' : null),
  },

  // 8. employmentType
  {
    id: 'employmentType',
    field: 'employmentType',
    message: '雇用形態を選択してください。\n(Employment type)',
    ui: {
      type: 'options',
      options: [
        { value: 'fulltime', label: '正社員', icon: '👔' },
        { value: 'parttime', label: 'パート・アルバイト', icon: '⏰' },
        { value: 'contract', label: '契約社員', icon: '📋' },
        { value: 'dispatch', label: '派遣社員', icon: '🔄' },
      ],
      allowCustom: false,
      field: 'employmentType',
    },
    validate: (v) => (!v ? '雇用形態を選択してください' : null),
  },

  // 9. startDate
  {
    id: 'startDate',
    field: 'startDate',
    message: '入社日を選択してください。\n(Start date)',
    ui: {
      type: 'date',
      field: 'startDate',
    },
    validate: (v) => (!v ? '入社日を選択してください' : null),
  },

  // 10. endDate (conditional)
  {
    id: 'endDate',
    field: 'endDate',
    message: '契約終了日を選択してください。\n(Contract end date)',
    ui: {
      type: 'date',
      field: 'endDate',
    },
    skipIf: (data) =>
      data.employmentType !== 'parttime' && data.employmentType !== 'contract',
    validate: (v) => (!v ? '契約終了日を選択してください' : null),
  },

  // 11. salaryType
  {
    id: 'salaryType',
    field: 'salaryType',
    message: '給与タイプを選択してください。\n(Salary type)',
    ui: {
      type: 'options',
      options: [
        { value: 'monthly', label: '月給', icon: '💴' },
        { value: 'hourly', label: '時給', icon: '⏱' },
        { value: 'daily', label: '日給', icon: '📅' },
      ],
      allowCustom: false,
      field: 'salaryType',
    },
    validate: (v) => (!v ? '給与タイプを選択してください' : null),
  },

  // 12. salary
  {
    id: 'salary',
    field: 'salary',
    message: '金額を入力してください。\n(Amount in ¥)',
    ui: {
      type: 'number',
      placeholder: '250000',
      prefix: '¥',
      field: 'salary',
    },
    validate: (v) => {
      if (!v || Number(v) <= 0) return '金額を入力してください'
      return null
    },
  },

  // 13. weeklyHours (conditional)
  {
    id: 'weeklyHours',
    field: 'weeklyHours',
    message: '週間労働時間を選択してください。\n(Weekly hours)',
    ui: {
      type: 'options',
      options: [
        { value: '10-20', label: '10〜20時間' },
        { value: '20-30', label: '20〜30時間' },
        { value: '30-40', label: '30〜40時間' },
      ],
      allowCustom: true,
      placeholder: '例: 15時間',
      field: 'weeklyHours',
    },
    skipIf: (data) => data.salaryType !== 'hourly',
    validate: (v) => (!v.trim() ? '週間労働時間を選択してください' : null),
  },

  // 14. paymentDate
  {
    id: 'paymentDate',
    field: 'paymentDate',
    message: '給与の支払日を選択してください。\n(Payment date)',
    ui: {
      type: 'options',
      options: [
        { value: '月末', label: '月末' },
        { value: '15日', label: '15日' },
        { value: '25日', label: '25日' },
      ],
      allowCustom: true,
      placeholder: '例: 10日',
      field: 'paymentDate',
    },
    validate: (v) => (!v.trim() ? '支払日を選択してください' : null),
  },

  // 15. workLocation
  {
    id: 'workLocation',
    field: 'workLocation',
    message: '勤務地を入力してください。\n(Work location)',
    ui: {
      type: 'text',
      placeholder: '東京都渋谷区...',
      field: 'workLocation',
    },
    validate: (v) => (!v.trim() ? '勤務地を入力してください' : null),
  },

  // 16. workHours
  {
    id: 'workHours',
    field: 'workHours',
    message: '勤務時間を選択してください。\n(Working hours)',
    ui: {
      type: 'options',
      options: [
        { value: '9:00〜18:00', label: '9:00〜18:00' },
        { value: '10:00〜19:00', label: '10:00〜19:00' },
        { value: 'シフト制', label: 'シフト制' },
      ],
      allowCustom: true,
      placeholder: '例: 8:00〜17:00',
      field: 'workHours',
    },
    validate: (v) => (!v.trim() ? '勤務時間を選択してください' : null),
  },

  // 17. trialPeriod
  {
    id: 'trialPeriod',
    field: 'trialPeriod',
    message: '試用期間を選択してください。\n(Trial period)',
    ui: {
      type: 'options',
      options: [
        { value: 'なし', label: 'なし' },
        { value: '1ヶ月', label: '1ヶ月' },
        { value: '2ヶ月', label: '2ヶ月' },
        { value: '3ヶ月', label: '3ヶ月' },
      ],
      allowCustom: true,
      placeholder: '例: 6ヶ月',
      field: 'trialPeriod',
    },
    validate: (v) => (!v.trim() ? '試用期間を選択してください' : null),
  },

  // 18. Confirmation
  {
    id: 'confirm',
    field: '__confirm',
    message: '入力内容を確認しています...',
    ui: {
      type: 'confirm',
    },
  },
]

let _msgId = 0
export function nextMsgId(): string {
  return `msg-${++_msgId}-${Date.now()}`
}
