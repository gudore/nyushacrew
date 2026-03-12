'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Search, Loader2, CheckCircle, MapPin, Clock, Banknote,
  Camera, Upload, Pencil,
} from 'lucide-react'
import OptionCard from '@/components/ui/OptionCard'
import AINote from '@/components/ui/AINote'

interface CommuteSelectorProps {
  address?: string
  workLocation: string
  onComplete: (data: Record<string, unknown>) => void
}

interface RouteResult {
  routeSummary: string
  duration: string
  monthlyFare: number | null
  source: string
  note?: string
}

interface LicenseData {
  licenseNumber?: string
  licenseExpiry?: string
}

const COMMUTE_OPTIONS = [
  { value: 'train', label: '電車・バス', icon: '🚃', description: '定期代を自動計算' },
  { value: 'car', label: '自動車', icon: '🚗', description: '免許証が必要' },
  { value: 'motorcycle', label: 'バイク', icon: '🏍', description: '免許証が必要' },
  { value: 'bicycle', label: '自転車', icon: '🚲' },
  { value: 'walk', label: '徒歩', icon: '🚶' },
]

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-gray-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 transition-colors'

export default function CommuteSelector({ address, workLocation, onComplete }: CommuteSelectorProps) {
  const [editingOrigin, setEditingOrigin] = useState(false)
  const [origin, setOrigin] = useState(address || '')
  const [method, setMethod] = useState<string | null>(null)

  // Train/bus state
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [manualRouteMode, setManualRouteMode] = useState(false)
  const [manualRoute, setManualRoute] = useState('')
  const [manualFare, setManualFare] = useState('')

  // Car/motorcycle state
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null)
  const [licenseProcessing, setLicenseProcessing] = useState(false)
  const [licensePreview, setLicensePreview] = useState<string | null>(null)
  const [licenseError, setLicenseError] = useState<string | null>(null)
  const [vehicleFare, setVehicleFare] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Route search (train/bus) ──
  const searchRoute = async () => {
    setRouteLoading(true)
    setRouteError(null)
    setRouteResult(null)
    try {
      const res = await fetch('/api/commute-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination: workLocation }),
      })
      const json = await res.json()
      if (!json.success) {
        setRouteError(json.error || 'ルート検索に失敗しました')
        return
      }
      setRouteResult(json as RouteResult)
    } catch {
      setRouteError('ルート検索中にエラーが発生しました')
    } finally {
      setRouteLoading(false)
    }
  }

  // ── License upload (car/motorcycle) ──
  const handleLicenseFile = useCallback(async (file: File) => {
    setLicenseError(null)
    if (file.size > 10 * 1024 * 1024) {
      setLicenseError('ファイルサイズが大きすぎます (max 10MB)')
      return
    }

    setLicensePreview(URL.createObjectURL(file))

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      setLicenseProcessing(true)
      try {
        const res = await fetch('/api/parse-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, documentType: '運転免許証' }),
        })
        const json = await res.json()
        if (!json.success || !json.extractedData) {
          setLicenseError(json.error || 'OCR処理に失敗しました')
          return
        }
        const data = json.extractedData as Record<string, unknown>
        setLicenseData({
          licenseNumber: data.licenseNumber as string | undefined,
          licenseExpiry: data.licenseExpiry as string | undefined,
        })
      } catch {
        setLicenseError('免許証の読み取りに失敗しました')
      } finally {
        setLicenseProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleLicenseInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLicenseFile(file)
  }

  // ── Confirm ──
  const handleConfirm = () => {
    const data: Record<string, unknown> = { commuteMethod: method }

    if (method === 'train') {
      if (manualRouteMode) {
        data.commuteRoute = manualRoute
        data.monthlyCost = manualFare ? Number(manualFare) : 0
      } else if (routeResult) {
        data.commuteRoute = routeResult.routeSummary
        data.commuteDuration = routeResult.duration
        data.monthlyCost = routeResult.monthlyFare ?? 0
      }
    } else if (method === 'car' || method === 'motorcycle') {
      data.licenseNumber = licenseData?.licenseNumber
      data.licenseExpiry = licenseData?.licenseExpiry
      data.monthlyCost = vehicleFare ? Number(vehicleFare) : 0
    } else {
      data.monthlyCost = 0
    }

    onComplete(data)
  }

  // Can confirm?
  const canConfirm = (() => {
    if (!method) return false
    if (method === 'train') return !!(routeResult || (manualRouteMode && manualRoute))
    if (method === 'car' || method === 'motorcycle') return !!licenseData
    return true // bicycle, walk
  })()

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">通勤情報</h2>
        <p className="text-sm text-gray-400 mt-1">Commute Information</p>
      </div>

      {/* Addresses */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">出発地 <span className="text-[10px]">Origin</span></p>
            {editingOrigin ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className={INPUT_CLASS}
                  autoFocus
                />
                <button
                  onClick={() => setEditingOrigin(false)}
                  className="px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 shrink-0"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {origin || <span className="text-gray-400">住所未入力</span>}
                </p>
                <button
                  onClick={() => setEditingOrigin(true)}
                  className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-0.5 shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  編集
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="border-l-2 border-dashed border-gray-200 ml-2 h-3" />
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400">目的地 <span className="text-[10px]">Destination</span></p>
            <p className="text-sm font-medium text-slate-800 truncate">{workLocation}</p>
          </div>
        </div>
      </div>

      {/* Commute method */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          通勤方法
          <span className="text-xs text-gray-400 ml-2">Commute Method</span>
        </label>
        <OptionCard
          options={COMMUTE_OPTIONS}
          value={method}
          onChange={(v) => {
            setMethod(v)
            // Reset sub-states when method changes
            setRouteResult(null)
            setRouteError(null)
            setManualRouteMode(false)
            setLicenseData(null)
            setLicensePreview(null)
          }}
          allowCustom={false}
        />
      </div>

      {/* ── Train/Bus panel ── */}
      {method === 'train' && (
        <div className="space-y-4 animate-[slideIn_0.3s_ease-out]">
          {!manualRouteMode && !routeResult && (
            <button
              onClick={searchRoute}
              disabled={routeLoading || !origin}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                         bg-amber-500 text-white font-bold hover:bg-amber-600
                         disabled:opacity-50 transition-colors"
            >
              {routeLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  検索中...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  最短ルートを検索 <span className="text-xs text-amber-100">Search Route</span>
                </>
              )}
            </button>
          )}

          {routeError && <AINote type="error" message={routeError} />}

          {/* Route result card */}
          {routeResult && !manualRouteMode && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 animate-[slideIn_0.3s_ease-out]">
              {routeResult.source === 'mock' && routeResult.note && (
                <AINote type="info" message={routeResult.note} />
              )}
              <p className="font-bold text-slate-800">{routeResult.routeSummary}</p>
              <div className="flex gap-6 text-sm">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  所要時間: {routeResult.duration}
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <Banknote className="w-4 h-4 text-gray-400" />
                  月額定期代: {routeResult.monthlyFare != null
                    ? `¥${routeResult.monthlyFare.toLocaleString()}`
                    : '情報なし'}
                </span>
              </div>
              <p className="text-xs text-gray-400">定期代は会社規定に基づき支給されます</p>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                             bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  このルートで確定 <span className="text-xs text-amber-100">Confirm Route</span>
                </button>
              </div>
              <button
                onClick={() => setManualRouteMode(true)}
                className="text-sm text-teal-600 hover:text-teal-800 transition-colors"
              >
                別のルートを入力 / Enter Different Route
              </button>
            </div>
          )}

          {/* Manual route entry */}
          {manualRouteMode && (
            <div className="space-y-4 animate-[slideIn_0.3s_ease-out]">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ルート名 <span className="text-xs text-gray-400">Route Name</span>
                </label>
                <input
                  type="text"
                  value={manualRoute}
                  onChange={(e) => setManualRoute(e.target.value)}
                  placeholder="例: JR東海道線 → 山手線 渋谷駅"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  月額定期代 <span className="text-xs text-gray-400">Monthly Pass (¥)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
                  <input
                    type="number"
                    value={manualFare}
                    onChange={(e) => setManualFare(e.target.value)}
                    placeholder="14520"
                    min="0"
                    className={`${INPUT_CLASS} pl-8`}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setManualRouteMode(false)
                  setRouteResult(null)
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← ルート検索に戻る
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Car / Motorcycle panel ── */}
      {(method === 'car' || method === 'motorcycle') && (
        <div className="space-y-4 animate-[slideIn_0.3s_ease-out]">
          <AINote type="info" message="運転免許証のアップロードが必要です。免許証の表面を撮影またはファイルを選択してください。" />

          {licenseError && <AINote type="error" message={licenseError} />}

          {!licenseData && (
            <>
              {/* Upload area */}
              <div className="relative">
                <div
                  className={`min-h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-4 p-6 transition-colors ${
                    licensePreview ? 'border-teal-300 bg-teal-50/30' : 'border-gray-300 bg-white'
                  }`}
                >
                  {licensePreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={licensePreview}
                      alt="License preview"
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-500">運転免許証の写真を撮影</p>
                    </>
                  )}
                </div>

                {licenseProcessing && (
                  <div className="absolute inset-0 rounded-xl bg-white/80 flex flex-col items-center justify-center gap-3 z-10">
                    <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-700">AIが免許証を読み取り中...</p>
                  </div>
                )}
              </div>

              {!licenseProcessing && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                               bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    写真を撮る
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                               border border-gray-300 text-gray-700 font-medium
                               hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    ファイルを選択
                  </button>
                </div>
              )}

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleLicenseInput} />
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleLicenseInput} />
            </>
          )}

          {/* License data display */}
          {licenseData && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 animate-[slideIn_0.3s_ease-out]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">免許証を確認しました</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">免許証番号</p>
                  <p className="font-medium text-slate-800">{licenseData.licenseNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">有効期限</p>
                  <p className="font-medium text-slate-800">{licenseData.licenseExpiry || '—'}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLicenseData(null)
                  setLicensePreview(null)
                }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                再アップロード
              </button>
            </div>
          )}

          {/* Monthly transportation cost */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              月額交通費（駐車場代・ガソリン代等）
              <span className="text-xs text-gray-400 ml-1">Monthly Cost</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
              <input
                type="number"
                value={vehicleFare}
                onChange={(e) => setVehicleFare(e.target.value)}
                placeholder="10000"
                min="0"
                className={`${INPUT_CLASS} pl-8`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Bicycle / Walk panel ── */}
      {(method === 'bicycle' || method === 'walk') && (
        <div className="space-y-4 animate-[slideIn_0.3s_ease-out]">
          <AINote
            type="info"
            message="交通費は支給されません / No commute allowance"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              月額交通費 <span className="text-xs text-gray-400">Monthly Cost</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">¥</span>
              <input
                type="number"
                value={0}
                disabled
                className={`${INPUT_CLASS} pl-8 bg-gray-100 text-gray-400`}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm button (for non-train methods or manual train route) ── */}
      {method && !(method === 'train' && routeResult && !manualRouteMode) && (
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg
                     bg-amber-500 text-white font-bold hover:bg-amber-600
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          確定する <span className="text-xs text-amber-100">Confirm</span>
        </button>
      )}
    </div>
  )
}
