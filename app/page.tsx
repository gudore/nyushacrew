'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Shield, Users, Info } from 'lucide-react'

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === 'true'
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [tokenInput, setTokenInput] = useState('')

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const input = tokenInput.trim()
    if (!input) return

    // Accept full URL or just token
    const match = input.match(/\/onboard\/([a-z0-9]+)\/?$/i)
    const token = match ? match[1] : input
    router.push(`/onboard/${token}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo + title */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-5">
            <span className="text-white font-bold text-2xl">人事</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">人事CREW</h1>
          <p className="text-lg text-teal-700 font-medium mt-1">Smart Onboarding</p>
          <p className="text-sm text-gray-400 mt-2">TECH CREW株式会社 オンボーディングシステム</p>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">デモモード / Demo Mode</p>
              <p className="mt-1 text-blue-600">
                デモデータで動作確認ができます。実際のデータは保存されません。
              </p>
            </div>
          </div>
        )}

        {/* Action cards */}
        <div className="space-y-3">
          {/* Admin button */}
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200
                       hover:border-teal-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0
                            group-hover:bg-teal-100 transition-colors">
              <Shield className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800">管理者</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
          </button>

          {/* Employee button / token input */}
          {!showTokenInput ? (
            <button
              onClick={() => setShowTokenInput(true)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-200
                         hover:border-amber-300 hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0
                              group-hover:bg-amber-100 transition-colors">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">従業員の方</p>
                <p className="text-xs text-gray-400">Employee</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-amber-500 transition-colors" />
            </button>
          ) : (
            <form
              onSubmit={handleEmployeeSubmit}
              className="rounded-xl bg-white border border-amber-200 p-4 space-y-3
                         animate-[slideIn_0.3s_ease-out]"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  オンボーディングURLまたはトークンを入力
                  <span className="text-xs text-gray-400 ml-1">Enter your onboarding URL or token</span>
                </label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="https://...  or  abc123def456"
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5
                             text-sm text-slate-800 placeholder-gray-400
                             focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                             transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTokenInput(false)
                    setTokenInput('')
                  }}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium
                             hover:bg-gray-50 transition-colors"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={!tokenInput.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                             bg-amber-500 text-white font-bold text-sm
                             hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400
                             disabled:cursor-not-allowed transition-colors"
                >
                  開始する
                  <span className="text-xs text-amber-100">Start</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-300">
          © TECH CREW株式会社
        </p>
      </div>
    </div>
  )
}
