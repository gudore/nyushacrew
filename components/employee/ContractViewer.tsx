'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, FileText, CheckSquare, Square, ChevronRight, AlertTriangle } from 'lucide-react'
import AINote from '@/components/ui/AINote'

interface ContractViewerProps {
  token: string
  onComplete: () => void
}

export default function ContractViewer({ token, onComplete }: ContractViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [summaryBullets, setSummaryBullets] = useState<string[] | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Fetch PDF for desktop
  useEffect(() => {
    if (isMobile) {
      setPdfLoading(false)
      return
    }

    let revoked = false
    async function fetchPdf() {
      try {
        const res = await fetch(`/api/generate-contract?token=${encodeURIComponent(token)}`)
        if (!res.ok) {
          setPdfError(true)
          setPdfLoading(false)
          return
        }
        const blob = await res.blob()
        if (revoked) return
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } catch {
        setPdfError(true)
      } finally {
        if (!revoked) setPdfLoading(false)
      }
    }
    fetchPdf()

    return () => {
      revoked = true
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isMobile])

  // Fetch summary for mobile
  const fetchSummary = useCallback(async () => {
    if (summaryBullets || summaryLoading) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      // First get the contract data from the onboarding record
      const recordRes = await fetch(`/api/onboarding/${encodeURIComponent(token)}`)
      const recordJson = await recordRes.json()
      if (!recordJson.success) {
        setSummaryError('契約データの取得に失敗しました')
        return
      }

      const res = await fetch('/api/generate-contract-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: recordJson.data.contract }),
      })
      const json = await res.json()
      if (!json.success) {
        setSummaryError(json.error || '要約の生成に失敗しました')
        return
      }
      setSummaryBullets(json.data as string[])
    } catch {
      setSummaryError('契約要約の取得に失敗しました')
    } finally {
      setSummaryLoading(false)
    }
  }, [token, summaryBullets, summaryLoading])

  // Auto-fetch summary on mobile
  useEffect(() => {
    if (isMobile) fetchSummary()
  }, [isMobile, fetchSummary])

  return (
    <div className="space-y-6 animate-[slideIn_0.3s_ease-out]">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-slate-800">契約確認</h2>
        <p className="text-sm text-gray-400 mt-1">Contract Review</p>
      </div>

      {/* Contract viewer area */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isMobile ? (
          // Mobile: show AI summary bullets
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-700">
              <FileText className="w-4 h-4" />
              <span>契約内容の要約</span>
              <span className="text-xs text-gray-400 font-normal">Contract Summary</span>
            </div>

            {summaryLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">AIが契約を要約中...</p>
                  <p className="text-xs text-gray-400 mt-0.5">Generating contract summary...</p>
                </div>
              </div>
            )}

            {summaryError && (
              <AINote type="error" message={summaryError} />
            )}

            {summaryBullets && (
              <ul className="space-y-3">
                {summaryBullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            <AINote
              type="info"
              message="この要約はAIが生成したものです。正式な契約内容はPDFをご確認ください。 / This summary was generated by AI. Please refer to the PDF for the official contract."
            />
          </div>
        ) : (
          // Desktop: iframe PDF viewer
          <div className="relative">
            {pdfLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">契約書を読み込み中...</p>
                  <p className="text-xs text-gray-400 mt-0.5">Loading contract...</p>
                </div>
              </div>
            )}

            {pdfError && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">契約書の読み込みに失敗しました</p>
                  <p className="text-xs text-gray-400 mt-0.5">Failed to load the contract</p>
                </div>
                <button
                  onClick={() => {
                    setPdfError(false)
                    setPdfLoading(true)
                    fetch(`/api/generate-contract?token=${encodeURIComponent(token)}`)
                      .then((res) => {
                        if (!res.ok) throw new Error()
                        return res.blob()
                      })
                      .then((blob) => {
                        setPdfUrl(URL.createObjectURL(blob))
                        setPdfLoading(false)
                      })
                      .catch(() => {
                        setPdfError(true)
                        setPdfLoading(false)
                      })
                  }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  再試行 / Retry
                </button>
              </div>
            )}

            {pdfUrl && !pdfLoading && (
              <iframe
                src={pdfUrl}
                className="w-full border-0"
                style={{ height: '70vh', minHeight: '500px' }}
                title="Contract PDF"
              />
            )}
          </div>
        )}
      </div>

      {/* Confirmation checkbox */}
      <div
        className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setConfirmed((prev) => !prev)}
      >
        {confirmed ? (
          <CheckSquare className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        ) : (
          <Square className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="text-sm font-medium text-slate-700">
            上記の契約内容を確認しました
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            I have read and understood the contract
          </p>
        </div>
      </div>

      {/* Proceed button */}
      <button
        onClick={onComplete}
        disabled={!confirmed}
        className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg font-bold transition-colors ${
          confirmed
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <span>
          署名に進む
          <span className={`text-xs ml-1 ${confirmed ? 'text-amber-100' : 'text-gray-300'}`}>
            Proceed to Sign
          </span>
        </span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
