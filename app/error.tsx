'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h1 className="text-xl font-bold text-slate-800 mt-4">エラーが発生しました</h1>
        <p className="text-sm text-gray-400 mt-1">An error occurred</p>
        <p className="text-gray-500 text-sm mt-4">
          予期せぬエラーが発生しました。もう一度お試しください。
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-teal-600 text-white font-bold text-sm
                       hover:bg-teal-700 transition-colors"
          >
            再試行する
            <span className="text-xs text-teal-200 ml-1">Retry</span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-600 font-medium text-sm
                       hover:bg-gray-50 transition-colors"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  )
}
