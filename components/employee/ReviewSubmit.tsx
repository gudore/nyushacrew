'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ContractData, PersonalData, FamilyMember, DocumentUpload } from '@/lib/types'

interface ReviewSubmitProps {
  token: string
  contract: ContractData
  personal: Partial<PersonalData>
}

// ── Accordion section ──
function Section({
  title,
  sub,
  defaultOpen = false,
  children,
}: {
  title: string
  sub: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <span className="font-bold text-slate-800 text-sm">{title}</span>
          <span className="text-xs text-gray-400 ml-2">{sub}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  )
}

// ── Read-only field row ──
function Field({ label, sub, value }: { label: string; sub: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">
        {label} <span className="text-[10px]">{sub}</span>
      </p>
      <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
    </div>
  )
}

// ── Skeleton loading lines ──
function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" style={{ width: `${70 + i * 5}%` }} />
      ))}
    </div>
  )
}

// ── Visa expiry color helper ──
function visaExpiryColor(expiry: string): string {
  const now = new Date()
  const exp = new Date(expiry)
  const diffMs = exp.getTime() - now.getTime()
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30)
  if (diffMonths < 3) return 'text-red-600'
  if (diffMonths < 6) return 'text-amber-600'
  return 'text-green-600'
}

// ── Gender label ──
function genderLabel(g?: string): string {
  if (g === 'male') return '男性'
  if (g === 'female') return '女性'
  if (g === 'other') return 'その他'
  return g || '—'
}

// ── Commute method label ──
function commuteMethodLabel(m?: string): string {
  const map: Record<string, string> = {
    train: '電車・バス',
    bus: 'バス',
    car: '自動車',
    motorcycle: 'バイク',
    bicycle: '自転車',
    walking: '徒歩',
    walk: '徒歩',
    mixed: '複合',
  }
  return (m && map[m]) || m || '—'
}

export default function ReviewSubmit({ token, contract, personal }: ReviewSubmitProps) {
  const [summaryBullets, setSummaryBullets] = useState<string[] | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Access extra fields from collectedData (merged from step outputs)
  const p = personal as Record<string, unknown>
  const isJapanese = p.isJapanese === true || p.nationality === '日本'

  // Family members
  const familyMembers = (p.familyMembers ?? p.family ?? []) as FamilyMember[]

  // Documents
  const documents = (p.documents ?? []) as DocumentUpload[]

  // Emergency contacts
  const emergencyContact = p.emergencyContact as
    | { name?: string; relationship?: string; phone?: string }
    | undefined
  const emergencyContact2 = p.emergencyContact2 as
    | { name?: string; relationship?: string; phone?: string }
    | undefined

  // Commute
  const commute = p.commute as PersonalData['commute'] | undefined
  const commuteMethod = (p.commuteMethod ?? commute?.method) as string | undefined
  const commuteRoute = (p.commuteRoute ?? commute?.route) as string | undefined
  const monthlyCost = (p.monthlyCost ?? commute?.monthlyCost) as number | undefined

  // Visa info (from foreigner doc uploader)
  const visaStatus = p.visaStatus as string | undefined
  const visaExpiry = p.visaExpiry as string | undefined
  const residenceCardNumber = p.residenceCardNumber as string | undefined

  // Address formatter
  const address = p.address as PersonalData['address'] | undefined
  const addressStr = address
    ? [address.postalCode && `〒${address.postalCode}`, address.prefecture, address.city, address.street, address.building]
        .filter(Boolean)
        .join(' ')
    : (p.address as string) || '—'

  // ── Fetch contract summary ──
  useEffect(() => {
    let cancelled = false
    async function fetchSummary() {
      setSummaryLoading(true)
      try {
        const res = await fetch('/api/generate-contract-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contract }),
        })
        const json = await res.json()
        if (!cancelled && json.success && json.data) {
          setSummaryBullets(json.data as string[])
        }
      } catch {
        // Non-critical — summary is informational
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }
    fetchSummary()
    return () => {
      cancelled = true
    }
  }, [contract])

  // ── Submit handler ──
  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/onboarding/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal }),
      })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || '送信に失敗しました。再度お試しください。')
        setSubmitting(false)
        return
      }
      setSubmitted(true)
    } catch {
      toast.error('送信に失敗しました。再度お試しください。')
      setSubmitting(false)
    }
  }, [token, personal])

  // ── Full-screen submitting overlay ──
  if (submitting && !submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin" />
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">データを送信中...</p>
          <p className="text-sm text-gray-400 mt-1">Submitting...</p>
        </div>
      </div>
    )
  }

  // ── Full-screen success state ──
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 px-6">
        <div className="relative">
          <CheckCircle className="w-20 h-20 text-green-500 animate-[slideIn_0.5s_ease-out]" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-green-200 animate-ping opacity-30" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">提出完了！</h1>
          <p className="text-sm text-gray-400 mt-1">Submission Complete!</p>
        </div>
        <p className="text-sm text-gray-600 text-center max-w-xs">
          担当者が確認後ご連絡します。
          <br />
          <span className="text-xs text-gray-400">You will be contacted after review.</span>
        </p>
        <div className="mt-4 bg-gray-50 rounded-lg px-6 py-3 text-center">
          <p className="text-xs text-gray-400 mb-1">受付番号 / Reference Number</p>
          <p className="font-mono text-sm font-bold text-slate-800 tracking-wider">{token}</p>
        </div>
      </div>
    )
  }

  // ── Main review content ──
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">確認・提出</h2>
        <p className="text-sm text-gray-400 mt-1">Review & Submit</p>
      </div>

      {/* Section 1: Contract summary */}
      <Section title="契約内容" sub="Contract Terms" defaultOpen>
        {summaryLoading ? (
          <Skeleton />
        ) : summaryBullets && summaryBullets.length > 0 ? (
          <ul className="space-y-2">
            {summaryBullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-teal-500 mt-0.5 shrink-0">•</span>
                {bullet}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">契約要約を取得できませんでした</p>
        )}
      </Section>

      {/* Section 2: Personal info */}
      <Section title="本人情報" sub="Personal Info">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="氏名"
            sub="Name"
            value={
              (p.fullNameJP as string) ||
              (p.lastName && p.firstName ? `${p.lastName} ${p.firstName}` : '') ||
              (p.lastNameKana && p.firstNameKana
                ? `${p.lastNameKana} ${p.firstNameKana}`
                : '—')
            }
          />
          <Field label="生年月日" sub="Date of Birth" value={(p.birthDate as string) || (p.dateOfBirth as string)} />
          <Field label="性別" sub="Gender" value={genderLabel(p.gender as string)} />
          <Field label="国籍" sub="Nationality" value={p.nationality as string} />
          <div className="col-span-2">
            <Field label="住所" sub="Address" value={addressStr} />
          </div>
        </div>
      </Section>

      {/* Section 3: Visa info (non-Japanese only) */}
      {!isJapanese && (visaStatus || visaExpiry || residenceCardNumber) && (
        <Section title="在留情報" sub="Visa Info">
          <div className="grid grid-cols-2 gap-4">
            <Field label="在留資格" sub="Visa Status" value={visaStatus} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">
                在留期限 <span className="text-[10px]">Expiry</span>
              </p>
              <p
                className={`text-sm font-medium ${
                  visaExpiry ? visaExpiryColor(visaExpiry) : 'text-slate-800'
                }`}
              >
                {visaExpiry || '—'}
                {visaExpiry && (
                  <span className="ml-2 text-xs">
                    {new Date(visaExpiry) < new Date()
                      ? '（期限切れ）'
                      : visaExpiryColor(visaExpiry) === 'text-red-600'
                        ? '（3ヶ月以内）'
                        : visaExpiryColor(visaExpiry) === 'text-amber-600'
                          ? '（6ヶ月以内）'
                          : ''}
                  </span>
                )}
              </p>
            </div>
            <Field label="在留カード番号" sub="Card Number" value={residenceCardNumber} />
          </div>
        </Section>
      )}

      {/* Section 4: Commute */}
      <Section title="通勤情報" sub="Commute">
        <div className="grid grid-cols-2 gap-4">
          <Field label="通勤手段" sub="Method" value={commuteMethodLabel(commuteMethod)} />
          <Field
            label="月額交通費"
            sub="Monthly Cost"
            value={
              monthlyCost !== undefined && monthlyCost !== null
                ? `¥${Number(monthlyCost).toLocaleString()}`
                : '—'
            }
          />
          {commuteRoute && (
            <div className="col-span-2">
              <Field label="ルート" sub="Route" value={commuteRoute} />
            </div>
          )}
        </div>
      </Section>

      {/* Section 5: Family (only if members exist) */}
      {familyMembers.length > 0 && (
        <Section title="家族情報" sub="Family">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-400 text-xs">氏名</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-400 text-xs">続柄</th>
                  <th className="text-left py-2 font-medium text-gray-400 text-xs">生年月日</th>
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
          </div>
        </Section>
      )}

      {/* Section 6: Emergency contact */}
      <Section title="緊急連絡先" sub="Emergency Contact">
        <div className="space-y-4">
          {emergencyContact && (
            <div className="grid grid-cols-3 gap-4">
              <Field label="氏名" sub="Name" value={emergencyContact.name} />
              <Field label="続柄" sub="Relationship" value={emergencyContact.relationship} />
              <Field label="電話番号" sub="Phone" value={emergencyContact.phone} />
            </div>
          )}
          {emergencyContact2 && emergencyContact2.name && (
            <>
              <hr className="border-gray-100" />
              <p className="text-xs text-gray-400">第二連絡先</p>
              <div className="grid grid-cols-3 gap-4">
                <Field label="氏名" sub="Name" value={emergencyContact2.name} />
                <Field label="続柄" sub="Relationship" value={emergencyContact2.relationship} />
                <Field label="電話番号" sub="Phone" value={emergencyContact2.phone} />
              </div>
            </>
          )}
          {!emergencyContact && (
            <p className="text-sm text-gray-400">緊急連絡先が登録されていません</p>
          )}
        </div>
      </Section>

      {/* Section 7: Uploaded documents */}
      {documents.length > 0 && (
        <Section title="アップロード済み書類" sub="Uploaded Documents">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {documents.map((doc, i) => (
              <a
                key={i}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-gray-200 overflow-hidden hover:border-teal-400 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  alt={doc.type}
                  className="w-full h-24 object-cover bg-gray-100"
                />
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-slate-700 truncate">{doc.type}</span>
                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-teal-500 shrink-0" />
                </div>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-300 accent-amber-500"
        />
        <div>
          <p className="text-sm font-medium text-slate-800">
            上記の内容に間違いがないことを確認しました
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            I confirm the above information is correct
          </p>
        </div>
      </label>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!confirmed}
        className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl
                   bg-amber-500 text-white font-bold text-lg
                   hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <CheckCircle className="w-5 h-5" />
        提出する <span className="text-sm text-amber-100">Submit</span>
      </button>
    </div>
  )
}
