'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react'
import OptionCard from '@/components/ui/OptionCard'
import AINote from '@/components/ui/AINote'

interface FamilyDataFormProps {
  onComplete: (data: Record<string, unknown>) => void
}

interface FamilyMemberRow {
  name: string
  relationship: string
  dateOfBirth: string
}

const MODE_OPTIONS = [
  { value: 'upload', label: '住民票をアップロード', icon: '📄', description: '自動入力' },
  { value: 'manual', label: '手動で入力', icon: '✏️', description: '家族情報を入力' },
  { value: 'skip', label: 'スキップ', icon: '⏭', description: '家族情報なし・後で追加' },
]

const RELATIONSHIP_OPTIONS = [
  { value: '配偶者', label: '配偶者' },
  { value: '子', label: '子' },
  { value: '父', label: '父' },
  { value: '母', label: '母' },
  { value: '兄弟姉妹', label: '兄弟姉妹' },
  { value: 'その他', label: 'その他' },
]

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-colors'

function emptyMember(): FamilyMemberRow {
  return { name: '', relationship: '', dateOfBirth: '' }
}

export default function FamilyDataForm({ onComplete }: FamilyDataFormProps) {
  const [mode, setMode] = useState<string | null>(null)

  // Upload state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Family members (shared by upload + manual)
  const [members, setMembers] = useState<FamilyMemberRow[]>([])
  const [ocrDone, setOcrDone] = useState(false)

  // ── Upload handler ──
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
          body: JSON.stringify({ imageBase64: base64, documentType: 'juminHyo' }),
        })
        const json = await res.json()

        if (!json.success || !json.extractedData) {
          setError(json.error || 'OCR処理に失敗しました')
          setProcessing(false)
          return
        }

        const data = json.extractedData as Record<string, unknown>
        const household = (data.householdMembers || data.members || []) as Array<{
          name?: string
          relationship?: string
          dateOfBirth?: string
        }>

        if (household.length > 0) {
          setMembers(
            household.map((m) => ({
              name: m.name || '',
              relationship: m.relationship || '',
              dateOfBirth: m.dateOfBirth || '',
            }))
          )
        } else {
          setMembers([emptyMember()])
        }
        setOcrDone(true)
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

  // ── Member editing ──
  const updateMember = (index: number, field: keyof FamilyMemberRow, value: string) => {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const removeMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index))
  }

  const addMember = () => {
    setMembers((prev) => [...prev, emptyMember()])
  }

  // ── Confirm ──
  const handleConfirm = () => {
    const familyMembers = members
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name.trim(),
        relationship: m.relationship,
        dateOfBirth: m.dateOfBirth,
        isDependent: true,
      }))
    onComplete({ familyMembers })
  }

  // ── Mode selection ──
  if (!mode) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">家族情報</h2>
          <p className="text-sm text-gray-400 mt-1">Family Information</p>
        </div>

        <p className="text-sm text-gray-600 text-center">
          住民票をお持ちの場合、アップロードすると家族情報が自動入力されます。（任意）
        </p>

        <OptionCard
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          allowCustom={false}
        />
      </div>
    )
  }

  // ── Skip ──
  if (mode === 'skip') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">家族情報</h2>
          <p className="text-sm text-gray-400 mt-1">Family Information</p>
        </div>

        <AINote
          type="info"
          message="家族情報はスキップされました。後で担当者に連絡することもできます。"
        />

        <div className="flex gap-3">
          <button
            onClick={() => setMode(null)}
            className="px-5 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium
                       hover:bg-gray-50 transition-colors"
          >
            ← 戻る
          </button>
          <button
            onClick={() => onComplete({ familyMembers: [] })}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                       bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            次へ進む <span className="text-xs text-amber-100">Continue</span>
          </button>
        </div>
      </div>
    )
  }

  // ── Manual: start with one empty member ──
  if (mode === 'manual' && members.length === 0) {
    setMembers([emptyMember()])
  }

  // ── Upload: show upload zone before OCR is done ──
  if (mode === 'upload' && !ocrDone) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-slate-800">家族情報</h2>
          <p className="text-sm text-gray-400 mt-1">Family Information</p>
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
                  alt="住民票プレビュー"
                  className="max-h-64 mx-auto rounded-lg object-contain"
                />
              </div>
            ) : (
              <>
                <Camera className="w-10 h-10 text-gray-300" />
                <p className="text-sm text-gray-500">
                  住民票の写真を撮影またはファイルを選択
                </p>
                <p className="text-xs text-gray-400">Upload your residence certificate</p>
              </>
            )}
          </div>

          {processing && (
            <div className="absolute inset-0 rounded-xl bg-white/80 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">AIが住民票を読み取り中...</p>
                <p className="text-xs text-gray-400 mt-0.5">AI is reading your document...</p>
              </div>
            </div>
          )}
        </div>

        {!processing && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                         bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>写真を撮る <span className="text-xs text-teal-200">Take Photo</span></span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                         border border-gray-300 text-gray-700 font-medium
                         hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>ファイルを選択 <span className="text-xs text-gray-400">Choose File</span></span>
            </button>
          </div>
        )}

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

        {!processing && (
          <button
            onClick={() => {
              setMode(null)
              setPreviewUrl(null)
              setError(null)
            }}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 戻る
          </button>
        )}
      </div>
    )
  }

  // ── Editable family members table (upload result or manual entry) ──
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">家族情報</h2>
        <p className="text-sm text-gray-400 mt-1">Family Information</p>
      </div>

      {mode === 'upload' && ocrDone && (
        <AINote type="success" message="住民票から家族情報を読み取りました。内容を確認・修正してください。" />
      )}

      {/* Desktop: table layout */}
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-medium text-slate-700">
                氏名 <span className="text-xs text-gray-400 font-normal">Name</span>
              </th>
              <th className="text-left py-2 px-2 font-medium text-slate-700">
                続柄 <span className="text-xs text-gray-400 font-normal">Relationship</span>
              </th>
              <th className="text-left py-2 px-2 font-medium text-slate-700">
                生年月日 <span className="text-xs text-gray-400 font-normal">Date of Birth</span>
              </th>
              <th className="text-left py-2 px-2 font-medium text-slate-700 w-16">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="py-2 px-2">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateMember(idx, 'name', e.target.value)}
                    placeholder="山田 花子"
                    className={INPUT_CLASS}
                  />
                </td>
                <td className="py-2 px-2">
                  <OptionCard
                    options={RELATIONSHIP_OPTIONS}
                    value={member.relationship}
                    onChange={(v) => updateMember(idx, 'relationship', v)}
                    allowCustom={false}
                  />
                </td>
                <td className="py-2 px-2">
                  <input
                    type="date"
                    value={member.dateOfBirth}
                    onChange={(e) => updateMember(idx, 'dateOfBirth', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </td>
                <td className="py-2 px-2">
                  <button
                    type="button"
                    onClick={() => removeMember(idx)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card layout */}
      <div className="md:hidden space-y-4">
        {members.map((member, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 animate-[slideIn_0.3s_ease-out]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">家族 {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeMember(idx)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                氏名 <span className="text-xs text-gray-400">Name</span>
              </label>
              <input
                type="text"
                value={member.name}
                onChange={(e) => updateMember(idx, 'name', e.target.value)}
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
                value={member.relationship}
                onChange={(v) => updateMember(idx, 'relationship', v)}
                allowCustom={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                生年月日 <span className="text-xs text-gray-400">Date of Birth</span>
              </label>
              <input
                type="date"
                value={member.dateOfBirth}
                onChange={(e) => updateMember(idx, 'dateOfBirth', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add member button */}
      <button
        type="button"
        onClick={addMember}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
                   border-2 border-dashed border-gray-300 text-gray-500 font-medium
                   hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        家族を追加 <span className="text-xs text-gray-400">Add Family Member</span>
      </button>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => {
            setMode(null)
            setMembers([])
            setOcrDone(false)
            setPreviewUrl(null)
            setError(null)
          }}
          className="px-5 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium
                     hover:bg-gray-50 transition-colors"
        >
          ← 戻る
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                     bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          確定する <span className="text-xs text-amber-100">Confirm</span>
        </button>
      </div>
    </div>
  )
}
