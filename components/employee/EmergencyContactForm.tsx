'use client'

import { useState } from 'react'
import { CheckCircle, Plus, ChevronUp } from 'lucide-react'
import OptionCard from '@/components/ui/OptionCard'

interface EmergencyContactFormProps {
  onComplete: (data: Record<string, unknown>) => void
}

interface ContactData {
  name: string
  relationship: string
  phone: string
}

const RELATIONSHIP_OPTIONS = [
  { value: '配偶者', label: '配偶者' },
  { value: '親', label: '親' },
  { value: '兄弟姉妹', label: '兄弟姉妹' },
  { value: '友人', label: '友人' },
  { value: 'その他', label: 'その他' },
]

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-colors'

function stripHyphens(phone: string): string {
  return phone.replace(/-/g, '')
}

function isValidPhone(phone: string): boolean {
  return /^[0-9]{10,11}$/.test(stripHyphens(phone))
}

export default function EmergencyContactForm({ onComplete }: EmergencyContactFormProps) {
  const [primary, setPrimary] = useState<ContactData>({
    name: '',
    relationship: '',
    phone: '',
  })
  const [secondary, setSecondary] = useState<ContactData>({
    name: '',
    relationship: '',
    phone: '',
  })
  const [showSecondary, setShowSecondary] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [secondaryPhoneError, setSecondaryPhoneError] = useState<string | null>(null)

  // Validation
  const canSubmit =
    primary.name.trim() !== '' &&
    primary.relationship !== '' &&
    primary.phone.trim() !== '' &&
    isValidPhone(primary.phone)

  const handleConfirm = () => {
    // Validate primary phone
    if (!isValidPhone(primary.phone)) {
      setPhoneError('電話番号は10〜11桁の数字で入力してください')
      return
    }

    // Validate secondary phone if filled
    if (showSecondary && secondary.phone.trim() && !isValidPhone(secondary.phone)) {
      setSecondaryPhoneError('電話番号は10〜11桁の数字で入力してください')
      return
    }

    const emergencyContact = {
      name: primary.name.trim(),
      relationship: primary.relationship,
      phone: stripHyphens(primary.phone),
    }

    const data: Record<string, unknown> = { emergencyContact }

    // Include secondary if any field is filled
    if (showSecondary && secondary.name.trim()) {
      data.emergencyContact2 = {
        name: secondary.name.trim(),
        relationship: secondary.relationship,
        phone: stripHyphens(secondary.phone),
      }
    }

    onComplete(data)
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">緊急連絡先</h2>
        <p className="text-sm text-gray-400 mt-1">Emergency Contact</p>
      </div>

      {/* Primary contact */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-sm font-medium text-teal-700">
          第一連絡先 <span className="text-xs text-gray-400 font-normal">Primary Contact</span>
          <span className="text-red-500 ml-1">*</span>
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            氏名 <span className="text-xs text-gray-400">Name</span>
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={primary.name}
            onChange={(e) => setPrimary((p) => ({ ...p, name: e.target.value }))}
            placeholder="山田 太郎"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            続柄 <span className="text-xs text-gray-400">Relationship</span>
            <span className="text-red-500 ml-1">*</span>
          </label>
          <OptionCard
            options={RELATIONSHIP_OPTIONS}
            value={primary.relationship}
            onChange={(v) => setPrimary((p) => ({ ...p, relationship: v }))}
            allowCustom={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            電話番号 <span className="text-xs text-gray-400">Phone</span>
            <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="tel"
            value={primary.phone}
            onChange={(e) => {
              setPrimary((p) => ({ ...p, phone: e.target.value }))
              setPhoneError(null)
            }}
            placeholder="090-1234-5678"
            className={`${INPUT_CLASS} ${phoneError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
          />
          {phoneError && (
            <p className="text-xs text-red-500 mt-1">{phoneError}</p>
          )}
        </div>
      </div>

      {/* Secondary contact toggle */}
      {!showSecondary ? (
        <button
          type="button"
          onClick={() => setShowSecondary(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                     border-2 border-dashed border-gray-300 text-gray-500 font-medium
                     hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          第二緊急連絡先を追加 <span className="text-xs text-gray-400">Add Second Contact</span>
        </button>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 animate-[slideIn_0.3s_ease-out]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-teal-700">
              第二連絡先 <span className="text-xs text-gray-400 font-normal">Secondary Contact</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setShowSecondary(false)
                setSecondary({ name: '', relationship: '', phone: '' })
                setSecondaryPhoneError(null)
              }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              閉じる
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              氏名 <span className="text-xs text-gray-400">Name</span>
            </label>
            <input
              type="text"
              value={secondary.name}
              onChange={(e) => setSecondary((s) => ({ ...s, name: e.target.value }))}
              placeholder="山田 花子"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              続柄 <span className="text-xs text-gray-400">Relationship</span>
            </label>
            <OptionCard
              options={RELATIONSHIP_OPTIONS}
              value={secondary.relationship}
              onChange={(v) => setSecondary((s) => ({ ...s, relationship: v }))}
              allowCustom={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              電話番号 <span className="text-xs text-gray-400">Phone</span>
            </label>
            <input
              type="tel"
              value={secondary.phone}
              onChange={(e) => {
                setSecondary((s) => ({ ...s, phone: e.target.value }))
                setSecondaryPhoneError(null)
              }}
              placeholder="090-1234-5678"
              className={`${INPUT_CLASS} ${secondaryPhoneError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
            />
            {secondaryPhoneError && (
              <p className="text-xs text-red-500 mt-1">{secondaryPhoneError}</p>
            )}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-gray-400 text-center">
        緊急時のみ連絡いたします / Contact will only be made in emergencies
      </p>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                   bg-amber-500 text-white font-bold hover:bg-amber-600
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <CheckCircle className="w-4 h-4" />
        確定する <span className="text-xs text-amber-100">Confirm</span>
      </button>
    </div>
  )
}
