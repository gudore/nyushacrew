'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Loader2, PenTool, Type, Trash2, Check } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import AINote from '@/components/ui/AINote'

interface SignaturePadProps {
  token: string
  onComplete: (signatureBase64: string) => void
}

type TabMode = 'draw' | 'type'

export default function SignaturePad({ token, onComplete }: SignaturePadProps) {
  const [tab, setTab] = useState<TabMode>('draw')
  const [typedName, setTypedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fontLoaded, setFontLoaded] = useState(false)
  const sigCanvasRef = useRef<SignatureCanvas | null>(null)
  const textCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Load Dancing Script font for typed signature
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap'
    document.head.appendChild(link)

    link.onload = () => {
      // Give the font time to be applied
      setTimeout(() => setFontLoaded(true), 300)
    }

    return () => {
      document.head.removeChild(link)
    }
  }, [])

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
    } else {
      if (!typedName.trim()) {
        setError('名前を入力してください / Please enter your name')
        return
      }
      signatureData = renderTypedSignature()
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

  const canConfirm = tab === 'draw' ? true : typedName.trim().length > 0

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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'type'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>タイプ</span>
          <span className="text-xs text-gray-400">Type</span>
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
        ) : (
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
              このサインで確定
              <span className={`text-xs ml-1 ${canConfirm ? 'text-amber-100' : 'text-gray-300'}`}>
                Confirm Signature
              </span>
            </span>
          </>
        )}
      </button>
    </div>
  )
}
