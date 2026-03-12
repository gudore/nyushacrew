import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="text-xl font-bold text-slate-800 mt-4">ページが見つかりません</h1>
        <p className="text-sm text-gray-400 mt-1">Page not found</p>
        <p className="text-gray-500 text-sm mt-4">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block mt-6 px-5 py-2.5 rounded-lg bg-teal-600 text-white font-bold text-sm
                     hover:bg-teal-700 transition-colors"
        >
          トップへ戻る
          <span className="text-xs text-teal-200 ml-1">Back to Home</span>
        </Link>
      </div>
    </div>
  )
}
