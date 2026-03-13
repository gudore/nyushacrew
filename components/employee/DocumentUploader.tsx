'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Camera, Upload, Loader2, CheckCircle } from 'lucide-react'
import OptionCard from '@/components/ui/OptionCard'
import AINote from '@/components/ui/AINote'

interface DocumentUploaderProps {
  onComplete: (data: Record<string, unknown>) => void
}

const JAPANESE_DOC_OPTIONS = [
  { value: 'マイナンバーカード', label: 'マイナンバーカード', icon: '🪪' },
  { value: '運転免許証', label: '運転免許証', icon: '🚗' },
  { value: 'パスポート', label: 'パスポート', icon: '📘' },
]

const FOREIGN_DOC_OPTIONS = [
  { value: '在留カード', label: '在留カード', icon: '🪪' },
  { value: 'マイナンバーカード', label: 'マイナンバーカード', icon: '🪪' },
  { value: '運転免許証', label: '運転免許証', icon: '🚗' },
  { value: 'パスポート', label: 'パスポート', icon: '📘' },
]

// Standard fields to display in the review form
const BASE_REVIEW_FIELDS: { key: string; label: string; sub: string; alwaysShow?: boolean }[] = [
  { key: 'fullNameJP', label: '氏名（漢字）', sub: 'Full Name (Kanji)', alwaysShow: true },
  { key: 'fullNameEN', label: '氏名（ローマ字）', sub: 'Full Name (Roman)', alwaysShow: true },
  { key: 'fullNameKana', label: '読み仮名', sub: 'Kana Reading' },
  { key: 'birthDate', label: '生年月日', sub: 'Date of Birth' },
  { key: 'address', label: '住所', sub: 'Address', alwaysShow: true },
  { key: 'gender', label: '性別', sub: 'Gender' },
  { key: 'nationality', label: '国籍', sub: 'Nationality' },
]

// Extra fields shown when 在留カード is the selected document
const RESIDENCE_CARD_FIELDS: { key: string; label: string; sub: string; alwaysShow?: boolean }[] = [
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

export default function DocumentUploader({ onComplete }: DocumentUploaderProps) {
  const [nationality, setNationality] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null)
  const [confidence, setConfidence] = useState<Record<string, number>>({})
  const [warnings, setWarnings] = useState<string[]>([])
  const [editedData, setEditedData] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isJapanese = nationality === 'japanese'
  const isResidenceCard = documentType === '在留カード'

  // Dynamic review fields: add residence card fields when applicable
  const REVIEW_FIELDS = useMemo(
    () => isResidenceCard ? [...BASE_REVIEW_FIELDS, ...RESIDENCE_CARD_FIELDS] : BASE_REVIEW_FIELDS,
    [isResidenceCard],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      // File size check
      if (file.size > 10 * 1024 * 1024) {
        setError('ファイルサイズが大きすぎます (max 10MB)')
        return
      }

      // Show preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      // Convert to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result as string
        setProcessing(true)

        try {
          const res = await fetch('/api/parse-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, documentType }),
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

          // Initialize editable fields
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
    },
    [documentType, REVIEW_FIELDS],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleConfirm = () => {
    const result: Record<string, unknown> = {
      ...editedData,
      isJapanese,
      nationality: isJapanese ? '日本' : editedData.nationality || '',
      documentType,
      _ocrRaw: extractedData,
    }
    // When 在留カード was uploaded here, include visa data so the dedicated step can be skipped
    if (isResidenceCard && extractedData) {
      result.workPermitted = extractedData.workPermitted
      result._residenceCardOcrRaw = extractedData
    }
    onComplete(result)
  }

  // ── Sub-step 1: Nationality ──
  if (!nationality) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">本人確認書類</h2>
          <p className="text-sm text-gray-400 mt-1">Identity Document</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            国籍を選択してください
            <span className="text-xs text-gray-400 ml-2">Select your nationality</span>
          </label>
          <OptionCard
            options={[
              { value: 'japanese', label: '日本国籍', icon: '🇯🇵', description: 'マイナンバーカード・運転免許証・パスポート' },
              { value: 'foreign', label: '外国籍', icon: '🌍', description: '在留カード・マイナンバーカード・運転免許証・パスポート' },
            ]}
            value={nationality}
            onChange={setNationality}
            allowCustom={false}
          />
        </div>
      </div>
    )
  }

  // ── Sub-step 2: Document type ──
  if (!documentType) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">本人確認書類</h2>
          <p className="text-sm text-gray-400 mt-1">Identity Document</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            書類の種類を選択
            <span className="text-xs text-gray-400 ml-2">Select document type</span>
          </label>
          <OptionCard
            options={isJapanese ? JAPANESE_DOC_OPTIONS : FOREIGN_DOC_OPTIONS}
            value={documentType}
            onChange={setDocumentType}
            allowCustom={false}
          />
        </div>
        <button
          onClick={() => setNationality(null)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 国籍選択に戻る
        </button>
      </div>
    )
  }

  // ── Sub-step 5: Data review (shown after OCR success) ──
  if (extractedData && !processing) {
    return (
      <div className="space-y-6 animate-[slideIn_0.3s_ease-out]">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">読み取り結果の確認</h2>
          <p className="text-sm text-gray-400 mt-1">Review Extracted Data</p>
        </div>

        {/* Warnings from OCR */}
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
            if (value === undefined && !extractedData[field.key] && !field.alwaysShow) return null
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

  // ── Sub-steps 3 & 4: Upload + AI processing ──
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">本人確認書類</h2>
        <p className="text-sm text-gray-400 mt-1">Identity Document</p>
        <p className="text-sm text-teal-700 font-medium mt-2">{documentType}</p>
      </div>

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
                alt="Document preview"
                className="max-h-64 mx-auto rounded-lg object-contain"
              />
            </div>
          ) : (
            <>
              <Camera className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">書類の写真を撮影またはファイルを選択</p>
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

      {/* Back link */}
      {!processing && (
        <button
          onClick={() => {
            setDocumentType(null)
            setPreviewUrl(null)
            setError(null)
          }}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← 書類種類の選択に戻る
        </button>
      )}
    </div>
  )
}
