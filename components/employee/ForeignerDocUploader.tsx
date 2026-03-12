'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, CheckCircle, ShieldAlert, ShieldCheck } from 'lucide-react'
import AINote from '@/components/ui/AINote'

interface ForeignerDocUploaderProps {
  onComplete: (data: Record<string, unknown>) => void
}

const REVIEW_FIELDS: { key: string; label: string; sub: string }[] = [
  { key: 'fullNameJP', label: '氏名（漢字）', sub: 'Full Name (JP)' },
  { key: 'fullNameEN', label: '氏名（ローマ字）', sub: 'Full Name (EN)' },
  { key: 'birthDate', label: '生年月日', sub: 'Date of Birth' },
  { key: 'nationality', label: '国籍', sub: 'Nationality' },
  { key: 'residenceCardNumber', label: '在留カード番号', sub: 'Residence Card No.' },
  { key: 'visaStatus', label: '在留資格', sub: 'Visa Status' },
  { key: 'visaExpiry', label: '在留期間満了日', sub: 'Visa Expiry' },
]

function ConfidenceDot({ score }: { score: number | undefined }) {
  if (score === undefined) return null
  if (score > 0.85) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" title={`信頼度: ${Math.round(score * 100)}%`} />
  if (score >= 0.5) return <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" title={`信頼度: ${Math.round(score * 100)}%`} />
  return <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" title={`信頼度: ${Math.round(score * 100)}%`} />
}

function isWithinMonths(dateStr: string, months: number): boolean {
  const target = new Date(dateStr)
  const now = new Date()
  const limit = new Date(now)
  limit.setMonth(limit.getMonth() + months)
  return target <= limit && target >= now
}

export default function ForeignerDocUploader({ onComplete }: ForeignerDocUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null)
  const [confidence, setConfidence] = useState<Record<string, number>>({})
  const [warnings, setWarnings] = useState<string[]>([])
  const [editedData, setEditedData] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズが大きすぎます (max 10MB)')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setProcessing(true)

      try {
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, documentType: '在留カード' }),
        })
        const json = await res.json()

        if (!json.success || !json.extractedData) {
          setError(json.error || 'OCR処理に失敗しました')
          setProcessing(false)
          return
        }

        const data = json.extractedData as Record<string, unknown>
        setExtractedData(data)
        setConfidence((data.confidence as Record<string, number>) || {})
        setWarnings((data.warnings as string[]) || [])

        const editable: Record<string, string> = {}
        for (const field of REVIEW_FIELDS) {
          const val = data[field.key]
          if (val !== null && val !== undefined) {
            editable[field.key] = String(val)
          }
        }
        setEditedData(editable)
      } catch {
        setError('OCR処理中にエラーが発生しました')
      } finally {
        setProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleConfirm = () => {
    const workPermitted = extractedData?.workPermitted
    const result: Record<string, unknown> = {
      ...editedData,
      workPermitted,
      _residenceCardOcrRaw: extractedData,
    }
    onComplete(result)
  }

  // Computed visa warnings
  const visaExpiry = editedData.visaExpiry || (extractedData?.visaExpiry as string | undefined)
  const workPermitted = extractedData?.workPermitted
  const visaExpiryNear = visaExpiry ? isWithinMonths(visaExpiry, 6) : false
  const workRestricted = workPermitted === false

  // ── Data review ──
  if (extractedData && !processing) {
    return (
      <div className="space-y-6 animate-[slideIn_0.3s_ease-out]">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">在留カード</h2>
          <p className="text-sm text-gray-400 mt-1">Residence Card — Review</p>
        </div>

        {/* Prominent visa info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Visa status */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">在留資格 <span className="text-[10px]">Visa Status</span></p>
            <p className="text-lg font-bold text-slate-800">
              {editedData.visaStatus || '—'}
            </p>
          </div>

          {/* Expiry date */}
          <div className={`rounded-xl border p-4 text-center ${visaExpiryNear ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-400 mb-1">在留期限 <span className="text-[10px]">Expiry</span></p>
            <p className={`text-lg font-bold ${visaExpiryNear ? 'text-amber-700' : 'text-slate-800'}`}>
              {editedData.visaExpiry || '—'}
            </p>
          </div>

          {/* Work permitted */}
          <div className={`rounded-xl border p-4 text-center ${workRestricted ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-gray-400 mb-1">就労可否 <span className="text-[10px]">Work</span></p>
            {workRestricted ? (
              <div className="flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <span className="text-lg font-bold text-red-700">制限あり</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-lg font-bold text-green-700">就労可</span>
              </div>
            )}
          </div>
        </div>

        {/* Visa-related warnings */}
        {visaExpiryNear && (
          <AINote type="warning" message="在留期限が6ヶ月以内に迫っています。更新手続きの状況をご確認ください。" field="在留期限" />
        )}
        {workRestricted && (
          <AINote type="error" message="現在の在留資格では就労制限がある場合があります。担当者にご確認ください。" field="就労可否" />
        )}

        {/* OCR warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <AINote key={i} type="warning" message={w} />
            ))}
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4">
          {REVIEW_FIELDS.map((field) => {
            const value = editedData[field.key]
            if (value === undefined && !extractedData[field.key]) return null
            return (
              <div key={field.key}>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                  <ConfidenceDot score={confidence[field.key]} />
                  {field.label}
                  <span className="text-xs text-gray-400">{field.sub}</span>
                </label>
                <input
                  type="text"
                  value={value ?? ''}
                  onChange={(e) =>
                    setEditedData((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                             text-sm text-slate-800 placeholder-gray-400
                             focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                             transition-colors"
                />
              </div>
            )
          })}
        </div>

        {/* Confidence legend */}
        <div className="flex items-center gap-4 text-xs text-gray-400 pt-2">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> 高信頼度</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> 要確認</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" /> 低信頼度</span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              setExtractedData(null)
              setPreviewUrl(null)
              setEditedData({})
              setConfidence({})
              setWarnings([])
            }}
            className="px-5 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium
                       hover:bg-gray-50 transition-colors"
          >
            再アップロード
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                       bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            確認する <span className="text-xs text-amber-100">Confirm</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Upload UI ──
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">在留カード</h2>
        <p className="text-sm text-gray-400 mt-1">Residence Card</p>
      </div>

      <AINote type="info" message="在留カードの表面を撮影またはアップロードしてください。AIが自動的にデータを読み取ります。" />

      {error && <AINote type="error" message={error} />}

      {/* Upload area */}
      <div className="relative">
        <div
          className={`min-h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 p-6 transition-colors ${
            previewUrl ? 'border-teal-300 bg-teal-50/30' : 'border-gray-300 bg-white'
          }`}
        >
          {previewUrl ? (
            <div className="relative w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="在留カード preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
            </div>
          ) : (
            <>
              <Camera className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">在留カードの写真を撮影またはファイルを選択</p>
            </>
          )}
        </div>

        {/* Processing overlay */}
        {processing && (
          <div className="absolute inset-0 rounded-xl bg-white/80 flex flex-col items-center justify-center gap-3 z-10">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">AIが書類を読み取り中...</p>
              <p className="text-xs text-gray-400 mt-0.5">AI is reading your document...</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload buttons */}
      {!processing && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 min-h-11 rounded-lg
                       bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
          >
            <Camera className="w-4 h-4" />
            <span>写真を撮る <span className="text-xs text-teal-200">Take Photo</span></span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 min-h-11 rounded-lg
                       border border-gray-300 text-gray-700 font-medium
                       hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>ファイルを選択 <span className="text-xs text-gray-400">Choose File</span></span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
