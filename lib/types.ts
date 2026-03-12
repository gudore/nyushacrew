// ===== Contract Types =====
export interface ContractData {
  employeeName: string
  employeeNameKana: string
  employeeEmail: string
  employeePhone?: string
  position: string
  department: string
  employmentType: 'fulltime' | 'parttime' | 'contract' | 'dispatch'
  startDate: string
  endDate?: string
  salaryType: 'monthly' | 'hourly' | 'daily'
  salary: number
  weeklyHours?: string
  paymentDate: string
  workLocation: string
  workHours: string
  trialPeriod: string
  benefits: string[]
  specialConditions?: string
}

// ===== Personal Information =====
export interface PersonalData {
  lastName: string
  firstName: string
  lastNameKana: string
  firstNameKana: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  nationality: string
  address: Address
  phone: string
  email: string
  emergencyContact: EmergencyContact
  commute: CommuteData
  family: FamilyMember[]
  bankAccount: BankAccount
}

export interface Address {
  postalCode: string
  prefecture: string
  city: string
  street: string
  building?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  address?: string
}

export interface CommuteData {
  method: 'train' | 'bus' | 'car' | 'bicycle' | 'walking' | 'mixed'
  route?: string
  station?: string
  monthlyCost?: number
  duration?: string
}

export interface FamilyMember {
  name: string
  relationship: string
  dateOfBirth: string
  isDependent: boolean
  occupation?: string
}

export interface BankAccount {
  bankName: string
  branchName: string
  accountType: 'ordinary' | 'current'
  accountNumber: string
  accountHolder: string
}

// ===== Document Types =====
export interface DocumentUpload {
  type: DocumentType
  url: string
  extractedData?: Record<string, unknown>
  status: 'pending' | 'verified' | 'rejected'
}

export type DocumentType =
  | 'residence_card'
  | 'my_number'
  | 'passport'
  | 'drivers_license'
  | 'bank_book'
  | 'pension_book'
  | 'other'

// ===== AI Review =====
export interface AIReviewResult {
  overallStatus: 'pass' | 'warning' | 'fail'
  checks: AICheck[]
  summary: string
}

export interface AICheck {
  field: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  suggestion?: string
}

// ===== Onboarding State =====
export interface OnboardingRecord {
  id: string
  token: string
  status: 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'completed'
  contract: ContractData
  personal?: PersonalData
  documents?: DocumentUpload[]
  signature?: string
  aiReview?: AIReviewResult
  createdAt: string
  updatedAt: string
  submittedAt?: string
}

// ===== API Response Types =====
export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface OCRResult {
  extractedFields: Record<string, string>
  confidence: number
  rawText: string
}

// ===== Agent Chat Types =====
export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: AgentToolCall[]
}

export interface AgentToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  status: 'running' | 'completed' | 'error'
  result?: Record<string, unknown>
}

export interface AgentSSEEvent {
  type: 'text_delta' | 'tool_start' | 'tool_result' | 'done' | 'error'
  text?: string
  name?: string
  input?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
  toolCallId?: string
}

// ===== Utility =====
export function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}
