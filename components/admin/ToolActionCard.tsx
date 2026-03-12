'use client'

import { useState } from 'react'
import { Check, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

const TOOL_LABELS: Record<string, string> = {
  create_contract: '契約書を作成中...',
  list_onboardings: 'レコード一覧を取得中...',
  get_onboarding: 'レコード詳細を取得中...',
  update_status: 'ステータスを更新中...',
  generate_pdf_url: 'PDF URLを生成中...',
  export_csv_url: 'CSV URLを生成中...',
  get_dashboard_stats: '統計情報を取得中...',
}

const TOOL_DONE_LABELS: Record<string, string> = {
  create_contract: '契約を作成しました',
  list_onboardings: 'レコード一覧を取得しました',
  get_onboarding: 'レコード詳細を取得しました',
  update_status: 'ステータスを更新しました',
  generate_pdf_url: 'PDF URLを生成しました',
  export_csv_url: 'CSV URLを生成しました',
  get_dashboard_stats: '統計情報を取得しました',
}

interface ToolActionCardProps {
  name: string
  status: 'running' | 'completed' | 'error'
  input?: Record<string, unknown>
  result?: Record<string, unknown>
  error?: string
}

export default function ToolActionCard({ name, status, input, result, error }: ToolActionCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 text-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 transition-colors text-left"
      >
        {status === 'running' && <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />}
        {status === 'completed' && <Check className="w-4 h-4 text-green-600 shrink-0" />}
        {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}

        <span className={`flex-1 font-medium ${status === 'error' ? 'text-red-700' : 'text-gray-700'}`}>
          {status === 'running'
            ? TOOL_LABELS[name] || `${name} を実行中...`
            : status === 'error'
              ? error || 'エラーが発生しました'
              : TOOL_DONE_LABELS[name] || `${name} 完了`}
        </span>

        {(input || result) && (
          expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (input || result) && (
        <div className="border-t border-gray-200 px-3 py-2 space-y-2">
          {input && Object.keys(input).length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">入力</p>
              <pre className="text-xs text-gray-600 bg-white rounded p-2 overflow-x-auto">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {result && (
            <div>
              <p className="text-xs text-gray-400 mb-1">結果</p>
              <pre className="text-xs text-gray-600 bg-white rounded p-2 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
