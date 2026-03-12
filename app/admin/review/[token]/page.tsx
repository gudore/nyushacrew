'use client'

import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Download,
  Copy,
  X,
  ExternalLink,
} from 'lucide-react'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { toast } from 'sonner'
import AINote from '@/components/ui/AINote'
import type { ContractData, PersonalData, FamilyMember, DocumentUpload } from '@/lib/types'

interface DBRecord {
  id: string
  token: string
  status: string
  contract: ContractData
  personal: Record<string, unknown> | null
  documents: DocumentUpload[] | null
  signature: string | null
  aiReview: AIReview | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
}

interface AIReview {
  overallStatus?: string
  summary?: string
  flags?: { field: string; severity: string; message: string }[]
  recommendations?: string[]
  checks?: { field: string; status: string; message: string; suggestion?: string }[]
}

// ── Helpers ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '送信済み' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '進行中' },
    submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: '提出済み' },
    reviewed: { bg: 'bg-teal-100', text: 'text-teal-700', label: '確認済み' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: '承認済み' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: '完了' },
  }
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function AIOverallBadge({ status }: { status: string | undefined }) {
  if (!status) return null
  if (status === 'ok' || status === 'pass')
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-medium">✓ OK</span>
  if (status === 'warning')
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-sm font-medium">⚠ 要確認</span>
  if (status === 'review-needed' || status === 'fail')
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-3 py-1 text-sm font-medium">❌ 要審査</span>
  return null
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
    </div>
  )
}

function genderLabel(g?: string): string {
  if (g === 'male') return '男性'
  if (g === 'female') return '女性'
  if (g === 'other') return 'その他'
  return g || '—'
}

function commuteLabel(m?: string): string {
  const map: Record<string, string> = {
    train: '電車・バス', bus: 'バス', car: '自動車', motorcycle: 'バイク',
    bicycle: '自転車', walking: '徒歩', walk: '徒歩', mixed: '複合',
  }
  return (m && map[m]) || m || '—'
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  fulltime: '正社員', parttime: 'パート', contract: '契約社員', dispatch: '派遣社員',
}

function visaExpiryColor(expiry: string): string {
  const diffMs = new Date(expiry).getTime() - Date.now()
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30)
  if (diffMonths < 3) return 'text-red-600'
  if (diffMonths < 6) return 'text-amber-600'
  return 'text-green-600'
}

function formatAddress(addr: PersonalData['address'] | string | undefined): string {
  if (!addr) return '—'
  if (typeof addr === 'string') return addr
  return [addr.postalCode && `〒${addr.postalCode}`, addr.prefecture, addr.city, addr.street, addr.building]
    .filter(Boolean)
    .join(' ')
}

function flagSeverityToType(s: string): 'info' | 'warning' | 'error' {
  if (s === 'error') return 'error'
  if (s === 'warning') return 'warning'
  return 'info'
}

// ── Document type label map ──
const DOC_TYPE_LABELS: Record<string, string> = {
  residence_card: '在留カード',
  my_number: 'マイナンバーカード',
  passport: 'パスポート',
  drivers_license: '運転免許証',
  bank_book: '通帳',
  pension_book: '年金手帳',
  juminHyo: '住民票',
  other: 'その他',
}

export default function AdminReview({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [record, setRecord] = useState<DBRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const fetchRecord = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${token}`)
      const json = await res.json()
      if (json.success && json.data) {
        setRecord(json.data as DBRecord)
      }
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  const handleApprove = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('承認しました')
        fetchRecord()
      } else {
        toast.error(json.error || '承認に失敗しました')
      }
    } catch {
      toast.error('承認に失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', adminNote: rejectNote }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('差し戻しました')
        setShowRejectModal(false)
        setRejectNote('')
        fetchRecord()
      } else {
        toast.error(json.error || '差し戻しに失敗しました')
      }
    } catch {
      toast.error('差し戻しに失敗しました')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportCSV = () => {
    window.open(`/api/export-csv?token=${token}`, '_blank')
  }

  const copyOnboardingUrl = () => {
    const url = `${window.location.origin}/onboard/${token}`
    navigator.clipboard.writeText(url)
    toast.success('URLをコピーしました')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="animate-pulse flex items-center gap-2">
                <div className="h-5 w-32 bg-gray-200 rounded" />
                <div className="h-5 w-16 bg-gray-200 rounded-full" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="space-y-5">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">レコードが見つかりません</p>
          <Link href="/admin/dashboard" className="text-teal-600 hover:text-teal-800 text-sm mt-2 inline-block">
            ← ダッシュボードに戻る
          </Link>
        </div>
      </div>
    )
  }

  const c = record.contract
  const p = record.personal || {}
  const ai: AIReview | null = record.aiReview
  const docs = (record.documents || p.documents || []) as DocumentUpload[]
  const isJapanese = p.isJapanese === true || p.nationality === '日本'
  const familyMembers = (p.familyMembers ?? p.family ?? []) as FamilyMember[]
  const emergencyContact = p.emergencyContact as { name?: string; relationship?: string; phone?: string } | undefined
  const emergencyContact2 = p.emergencyContact2 as { name?: string; relationship?: string; phone?: string } | undefined
  const commute = p.commute as PersonalData['commute'] | undefined
  const commuteMethod = (p.commuteMethod as string) || commute?.method || ''
  const commuteRoute = (p.commuteRoute as string) || commute?.route || ''
  const monthlyCost = (p.monthlyCost as number) ?? commute?.monthlyCost
  const showOnboardingUrl = record.status === 'pending' || record.status === 'in_progress'

  // AI flags: support both prompt shapes (flags from validation prompt, checks from types.ts)
  const aiFlags = ai?.flags || ai?.checks?.map((ch) => ({
    field: ch.field,
    severity: ch.status === 'pass' ? 'info' : ch.status === 'warning' ? 'warning' : 'error',
    message: ch.message,
  })) || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-800">{c.employeeName}</h1>
                  <StatusBadge status={record.status} />
                  <AIOverallBadge status={ai?.overallStatus} />
                </div>
                <p className="text-xs text-gray-400">
                  {c.position} · {EMPLOYMENT_LABELS[c.employmentType] || c.employmentType}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: data */}
          <div className="lg:col-span-2 space-y-5">
            {/* Onboarding URL (if pending/in-progress) */}
            {showOnboardingUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-700 mb-2">オンボーディングURL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white rounded-lg px-3 py-2 text-slate-700 border border-blue-200 truncate">
                    {typeof window !== 'undefined' ? `${window.location.origin}/onboard/${token}` : `/onboard/${token}`}
                  </code>
                  <button
                    onClick={copyOnboardingUrl}
                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors shrink-0"
                    title="URLをコピー"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Review card */}
            {ai !== null ? <AIReviewCard ai={ai} aiFlags={aiFlags} /> : null}

            {/* Personal info */}
            <SectionCard title="本人情報" sub="Personal Info">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field
                  label="氏名"
                  value={
                    (p.fullNameJP as string) ||
                    (p.lastName && p.firstName ? `${p.lastName} ${p.firstName}` : '') ||
                    c.employeeName
                  }
                />
                <Field label="生年月日" value={(p.birthDate as string) || (p.dateOfBirth as string)} />
                <Field label="性別" value={genderLabel(p.gender as string)} />
                <Field label="国籍" value={p.nationality as string} />
                <div className="col-span-2 sm:col-span-3">
                  <Field label="住所" value={formatAddress(p.address as PersonalData['address'])} />
                </div>
              </div>
            </SectionCard>

            {/* Visa info */}
            {!isJapanese && !!(p.visaStatus || p.visaExpiry || p.residenceCardNumber) && (
              <SectionCard title="在留情報" sub="Visa Info">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Field label="在留資格" value={p.visaStatus as string} />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">在留期限</p>
                    <p className={`text-sm font-medium ${
                      p.visaExpiry ? visaExpiryColor(p.visaExpiry as string) : 'text-slate-800'
                    }`}>
                      {(p.visaExpiry as string) || '—'}
                    </p>
                  </div>
                  <Field label="カード番号" value={p.residenceCardNumber as string} />
                </div>
              </SectionCard>
            )}

            {/* Contract terms */}
            <SectionCard title="契約内容" sub="Contract Terms">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="ポジション" value={c.position} />
                <Field label="部署" value={c.department} />
                <Field label="雇用形態" value={EMPLOYMENT_LABELS[c.employmentType] || c.employmentType} />
                <Field label="入社日" value={c.startDate} />
                <Field label="退社日" value={c.endDate} />
                <Field
                  label="給与"
                  value={`¥${c.salary.toLocaleString()} / ${c.salaryType === 'monthly' ? '月' : c.salaryType === 'hourly' ? '時' : '日'}`}
                />
                <Field label="勤務地" value={c.workLocation} />
                <Field label="勤務時間" value={c.workHours} />
                <Field label="試用期間" value={c.trialPeriod} />
              </div>
            </SectionCard>

            {/* Commute */}
            <SectionCard title="通勤情報" sub="Commute">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="通勤手段" value={commuteLabel(commuteMethod)} />
                <Field label="月額交通費" value={monthlyCost != null ? `¥${Number(monthlyCost).toLocaleString()}` : '—'} />
                {commuteRoute && <div className="col-span-2"><Field label="ルート" value={commuteRoute} /></div>}
              </div>
            </SectionCard>

            {/* Family */}
            {familyMembers.length > 0 && (
              <SectionCard title="家族情報" sub="Family">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">氏名</th>
                      <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">続柄</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-400">生年月日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.map((fm, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-slate-800">{fm.name || '—'}</td>
                        <td className="py-2 pr-4 text-slate-800">{fm.relationship || '—'}</td>
                        <td className="py-2 text-slate-800">{fm.dateOfBirth || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            )}

            {/* Emergency contact */}
            <SectionCard title="緊急連絡先" sub="Emergency Contact">
              {emergencyContact ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="氏名" value={emergencyContact.name} />
                    <Field label="続柄" value={emergencyContact.relationship} />
                    <Field label="電話番号" value={emergencyContact.phone} />
                  </div>
                  {emergencyContact2 && emergencyContact2.name && (
                    <>
                      <hr className="border-gray-100" />
                      <p className="text-xs text-gray-400">第二連絡先</p>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="氏名" value={emergencyContact2.name} />
                        <Field label="続柄" value={emergencyContact2.relationship} />
                        <Field label="電話番号" value={emergencyContact2.phone} />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">未登録</p>
              )}
            </SectionCard>
          </div>

          {/* Right column: documents */}
          <div className="space-y-5">
            <SectionCard title="アップロード済み書類" sub="Documents">
              {docs.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {docs.map((doc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setModalImage(doc.url)}
                      className="group block rounded-lg border border-gray-200 overflow-hidden hover:border-teal-400 transition-colors text-left"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={doc.url}
                        alt={doc.type}
                        className="w-full h-28 object-cover bg-gray-100"
                      />
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-slate-700 truncate">
                          {DOC_TYPE_LABELS[doc.type] || doc.type}
                        </span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-teal-500 shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">書類がアップロードされていません</p>
              )}
            </SectionCard>

            {/* Signature */}
            {record.signature && (
              <SectionCard title="署名" sub="Signature">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={record.signature}
                  alt="署名"
                  className="w-full max-h-32 object-contain bg-white border border-gray-200 rounded-lg p-2"
                />
              </SectionCard>
            )}

            {/* Meta info */}
            <SectionCard title="メタ情報" sub="Metadata">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">トークン</span>
                  <span className="font-mono text-xs text-slate-700">{token}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">作成日</span>
                  <span className="text-slate-700">{new Date(record.createdAt).toLocaleDateString('ja-JP')}</span>
                </div>
                {record.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">提出日</span>
                    <span className="text-slate-700">{new Date(record.submittedAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </main>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20 pb-safe">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={actionLoading || record.status === 'approved'}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-green-600 text-white font-bold
                       hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            承認する <span className="text-xs text-green-200">Approve</span>
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg border-2 border-red-300 text-red-600 font-bold
                       hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            差し戻す <span className="text-xs text-red-400">Reject</span>
          </button>
          <div className="flex-1" />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300
                       text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {/* Image modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative bg-white rounded-xl max-w-3xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-gray-100 text-gray-600 shadow transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modalImage} alt="Document" className="w-full h-auto rounded-xl" />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800">差し戻し理由</h3>
            <p className="text-sm text-gray-500">従業員に修正を依頼する理由を入力してください。</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="例: 在留カードの有効期限が切れています。最新のカードを再アップロードしてください。"
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-800
                         placeholder-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200
                         transition-colors resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium
                           hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold
                           hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                差し戻す
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AIReviewCard({
  ai,
  aiFlags,
}: {
  ai: AIReview
  aiFlags: { field: string; severity: string; message: string }[]
}) {
  const borderColor =
    ai.overallStatus === 'ok' || ai.overallStatus === 'pass'
      ? 'border-green-200'
      : ai.overallStatus === 'warning'
        ? 'border-amber-200'
        : 'border-red-200'
  const bgColor =
    ai.overallStatus === 'ok' || ai.overallStatus === 'pass'
      ? 'bg-green-50'
      : ai.overallStatus === 'warning'
        ? 'bg-amber-50'
        : 'bg-red-50'

  return (
    <div className={`rounded-xl border overflow-hidden ${borderColor}`}>
      <div className={`px-5 py-4 ${bgColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-slate-800">AI レビュー結果</span>
          <AIOverallBadge status={ai.overallStatus} />
        </div>
        {ai.summary && (
          <p className="text-sm text-slate-700">{ai.summary}</p>
        )}
      </div>
      {aiFlags.length > 0 && (
        <div className="px-5 py-4 bg-white space-y-2">
          {aiFlags.map((flag, i) => (
            <AINote
              key={i}
              type={flagSeverityToType(flag.severity)}
              message={flag.message}
              field={flag.field}
            />
          ))}
        </div>
      )}
      {ai.recommendations && ai.recommendations.length > 0 && (
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">推奨アクション</p>
          <ul className="space-y-1">
            {ai.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SectionCard({
  title,
  sub,
  children,
}: {
  title: string
  sub: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <span className="font-bold text-sm text-slate-800">{title}</span>
        <span className="text-xs text-gray-400 ml-2">{sub}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
