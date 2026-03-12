'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, PenTool, Type, Trash2, Check, Stamp } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import AINote from '@/components/ui/AINote'

interface SignaturePadProps {
  token: string
  onComplete: (signatureBase64: string) => void
}

type TabMode = 'draw' | 'type' | 'inkan'

/**
 * Render a traditional Japanese inkan (印鑑) stamp on a canvas.
 * Red circle with name characters arranged vertically inside.
 */
function renderInkan(canvas: HTMLCanvasElement, name: string): string | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const size = 400
  const dpr = window.devicePixelRatio || 1
  canvas.width = size * dpr
  canvas.height = size * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, size, size)

  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 20

  // Outer circle
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = '#c41e1e'
  ctx.lineWidth = 8
  ctx.stroke()

  // Inner circle (subtle)
  ctx.beginPath()
  ctx.arc(cx, cy, radius - 12, 0, Math.PI * 2)
  ctx.strokeStyle = '#c41e1e'
  ctx.lineWidth = 2
  ctx.stroke()

  // Name characters — arrange vertically
  const chars = [...name.replace(/\s+/g, '')]
  if (chars.length === 0) return null

  ctx.fillStyle = '#c41e1e'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const maxChars = Math.min(chars.length, 4)
  const displayChars = chars.slice(0, maxChars)

  if (displayChars.length === 1) {
    // Single character — large centered
    ctx.font = `bold ${radius * 1.1}px "Noto Serif JP", "Yu Mincho", "MS Mincho", serif`
    ctx.fillText(displayChars[0], cx, cy + 4)
  } else if (displayChars.length === 2) {
    // Two characters — stacked vertically
    const fontSize = radius * 0.75
    ctx.font = `bold ${fontSize}px "Noto Serif JP", "Yu Mincho", "MS Mincho", serif`
    const gap = fontSize * 0.85
    ctx.fillText(displayChars[0], cx, cy - gap / 2 + 4)
    ctx.fillText(displayChars[1], cx, cy + gap / 2 + 4)
  } else if (displayChars.length === 3) {
    // Three characters — top one, bottom two side by side
    const fontSizeLarge = radius * 0.7
    const fontSizeSmall = radius * 0.55
    ctx.font = `bold ${fontSizeLarge}px "Noto Serif JP", "Yu Mincho", "MS Mincho", serif`
    ctx.fillText(displayChars[0], cx, cy - radius * 0.3)
    ctx.font = `bold ${fontSizeSmall}px "Noto Serif JP", "Yu Mincho", "MS Mincho", serif`
    const xOffset = radius * 0.3
    ctx.fillText(displayChars[1], cx - xOffset, cy + radius * 0.32)
    ctx.fillText(displayChars[2], cx + xOffset, cy + radius * 0.32)
  } else {
    // Four characters — 2x2 grid (top-right to bottom-left, traditional reading order)
    const fontSize = radius * 0.55
    ctx.font = `bold ${fontSize}px "Noto Serif JP", "Yu Mincho", "MS Mincho", serif`
    const xOff = radius * 0.3
    const yOff = radius * 0.3
    // Traditional order: top-right, bottom-right, top-left, bottom-left
    ctx.fillText(displayChars[0], cx + xOff, cy - yOff)
    ctx.fillText(displayChars[1], cx + xOff, cy + yOff)
    ctx.fillText(displayChars[2], cx - xOff, cy - yOff)
    ctx.fillText(displayChars[3], cx - xOff, cy + yOff)
  }

  return canvas.toDataURL('image/png')
}

export default function SignaturePad({ token, onComplete }: SignaturePadProps) {
  const [tab, setTab] = useState<TabMode>('draw')
  const [typedName, setTypedName] = useState('')
  const [inkanName, setInkanName] = useState('')
  const [inkanPreview, setInkanPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fontLoaded, setFontLoaded] = useState(false)
  const [serifFontLoaded, setSerifFontLoaded] = useState(false)
  const sigCanvasRef = useRef<SignatureCanvas | null>(null)
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const inkanCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Load Dancing Script font for typed signature
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap'
    document.head.appendChild(link)

    link.onload = () => {
      setTimeout(() => setFontLoaded(true), 300)
    }

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Load Noto Serif JP for inkan
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@700;900&display=swap'
    document.head.appendChild(link)

    link.onload = () => {
      setTimeout(() => setSerifFontLoaded(true), 500)
    }

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Re-render inkan preview when name or font changes
  useEffect(() => {
    if (!inkanCanvasRef.current || !inkanName.trim()) {
      setInkanPreview(null)
      return
    }
    if (!serifFontLoaded) return
    const result = renderInkan(inkanCanvasRef.current, inkanName)
    setInkanPreview(result)
  }, [inkanName, serifFontLoaded])

  const clearCanvas = useCallback(() => {
    sigCanvasRef.current?.clear()
  }, [])

  const isDrawEmpty = useCallback(() => {
    return sigCanvasRef.current?.isEmpty() ?? true
  }, [])

  const renderTypedSignature = useCallback((): string | null => {
    const canvas = textCanvasRef.current
    if (!canvas || !typedName.trim()) return null

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const dpr = window.devicePixelRatio || 1
    canvas.width = 600 * dpr
    canvas.height = 200 * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, 600, 200)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 600, 200)

    ctx.font = '48px "Dancing Script", cursive'
    ctx.fillStyle = '#1e293b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedName, 300, 100)

    return canvas.toDataURL('image/png')
  }, [typedName])

  const handleConfirm = async () => {
    setError(null)

    let signatureData: string | null = null

    if (tab === 'draw') {
      if (isDrawEmpty()) {
        setError('サインを入力してください / Please provide a signature')
        return
      }
      signatureData = sigCanvasRef.current?.toDataURL('image/png') ?? null
    } else if (tab === 'type') {
      if (!typedName.trim()) {
        setError('名前を入力してください / Please enter your name')
        return
      }
      signatureData = renderTypedSignature()
    } else {
      if (!inkanName.trim()) {
        setError('印鑑の名前を入力してください / Please enter a name for the seal')
        return
      }
      signatureData = inkanPreview
    }

    if (!signatureData) {
      setError('署名の生成に失敗しました / Failed to generate signature')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signatureData }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error || '署名の保存に失敗しました')
        return
      }
      onComplete(signatureData)
    } catch {
      setError('署名の保存中にエラーが発生しました / Error saving signature')
    } finally {
      setSaving(false)
    }
  }

  const canConfirm =
    tab === 'draw'
      ? true
      : tab === 'type'
        ? typedName.trim().length > 0
        : inkanName.trim().length > 0

  return (
    <div className="space-y-6 animate-[slideIn_0.3s_ease-out]">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">電子署名</h2>
        <p className="text-sm text-gray-400 mt-1">Electronic Signature</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
        <button
          onClick={() => setTab('draw')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'draw'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <PenTool className="w-4 h-4" />
          <span>手書き</span>
          <span className="text-xs text-gray-400">Draw</span>
        </button>
        <button
          onClick={() => setTab('type')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'type'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>タイプ</span>
          <span className="text-xs text-gray-400">Type</span>
        </button>
        <button
          onClick={() => setTab('inkan')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'inkan'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Stamp className="w-4 h-4" />
          <span>印鑑</span>
          <span className="text-xs text-gray-400">Seal</span>
        </button>
      </div>

      {/* Signature area */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {tab === 'draw' ? (
          <div>
            <div className="relative min-h-48 border-b border-gray-100">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#1e293b"
                canvasProps={{
                  className: 'w-full min-h-48',
                  style: { width: '100%', height: '192px' },
                }}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-xs text-gray-400">
                上の枠内にサインしてください
                <span className="block sm:inline sm:ml-1">Please sign in the box above</span>
              </p>
              <button
                onClick={clearCanvas}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>クリア</span>
                <span className="text-xs text-gray-400">Clear</span>
              </button>
            </div>
          </div>
        ) : tab === 'type' ? (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                お名前を入力
                <span className="text-xs text-gray-400 ml-2">Enter your name</span>
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                           text-sm text-slate-800 placeholder-gray-400
                           focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                           transition-colors"
              />
            </div>

            {/* Preview */}
            {typedName.trim() && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                <p className="text-xs text-gray-400 mb-3">プレビュー / Preview</p>
                <p
                  className="text-4xl text-slate-800"
                  style={{
                    fontFamily: fontLoaded ? '"Dancing Script", cursive' : 'cursive',
                  }}
                >
                  {typedName}
                </p>
              </div>
            )}

            {/* Hidden canvas for rendering typed signature to PNG */}
            <canvas
              ref={textCanvasRef}
              style={{ display: 'none' }}
              width={600}
              height={200}
            />
          </div>
        ) : (
          /* Inkan tab */
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                印鑑に表示する名前
                <span className="text-xs text-gray-400 ml-2">Name for the seal (1-4 characters)</span>
              </label>
              <input
                type="text"
                value={inkanName}
                onChange={(e) => setInkanName(e.target.value)}
                placeholder="田中"
                maxLength={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                           text-sm text-slate-800 placeholder-gray-400
                           focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100
                           transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                通常は姓（苗字）を入力します。1〜4文字まで。
                <span className="block sm:inline sm:ml-1">Usually your family name. 1-4 characters.</span>
              </p>
            </div>

            {/* Inkan preview */}
            {inkanPreview && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 flex flex-col items-center gap-3">
                <p className="text-xs text-gray-400">プレビュー / Preview</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={inkanPreview}
                  alt="印鑑プレビュー"
                  className="w-32 h-32 object-contain"
                />
              </div>
            )}

            {/* Hidden canvas for inkan rendering */}
            <canvas
              ref={inkanCanvasRef}
              style={{ display: 'none' }}
              width={400}
              height={400}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && <AINote type="error" message={error} />}

      {/* Legal note */}
      <AINote
        type="info"
        message="この電子署名は契約の同意を確認するものです / This electronic signature confirms your agreement to the contract"
      />

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!canConfirm || saving}
        className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg font-bold transition-colors ${
          canConfirm && !saving
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>保存中...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>
              {tab === 'inkan' ? 'この印鑑で確定' : 'このサインで確定'}
              <span className={`text-xs ml-1 ${canConfirm ? 'text-amber-100' : 'text-gray-300'}`}>
                {tab === 'inkan' ? 'Confirm Seal' : 'Confirm Signature'}
              </span>
            </span>
          </>
        )}
      </button>
    </div>
  )
}
