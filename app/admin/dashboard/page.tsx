'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Bot,
  LayoutDashboard,
} from 'lucide-react'
import Skeleton, { SkeletonRow } from '@/components/ui/Skeleton'
import AgentChatPanel from '@/components/admin/AgentChatPanel'
import type { ContractData } from '@/lib/types'

interface DBRecord {
  id: string
  token: string
  status: string
  contract: ContractData
  personal: Record<string, unknown> | null
  aiReview: { overallStatus?: string; flags?: unknown[] } | null
  createdAt: string
  updatedAt: string
  submittedAt: string | null
}

type FilterTab = 'all' | 'submitted' | 'review-needed' | 'approved'

const EMPLOYMENT_LABELS: Record<string, string> = {
  fulltime: '正社員',
  parttime: 'パート',
  contract: '契約社員',
  dispatch: '派遣社員',
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string; pulse?: boolean }> = {
    pending: { bg: 'bg-blue-100', text: 'text-blue-700', label: '送信済み' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '進行中' },
    submitted: { bg: 'bg-amber-100', text: 'text-amber-700', label: '提出済み', pulse: true },
    reviewed: { bg: 'bg-teal-100', text: 'text-teal-700', label: '確認済み' },
    approved: { bg: 'bg-green-100', text: 'text-green-700', label: '承認済み' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: '完了' },
  }
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
      )}
      {c.label}
    </span>
  )
}

function AIReviewBadge({ aiReview }: { aiReview: DBRecord['aiReview'] }) {
  if (!aiReview || !aiReview.overallStatus) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const s = aiReview.overallStatus
  if (s === 'ok' || s === 'pass') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">✓ OK</span>
  }
  if (s === 'warning') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">⚠ 要確認</span>
  }
  if (s === 'review-needed' || s === 'fail') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-medium">❌ 要審査</span>
  }
  return <span className="text-xs text-gray-400">—</span>
}

export default function AdminDashboard() {
  const [records, setRecords] = useState<DBRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [mobileView, setMobileView] = useState<'dashboard' | 'chat'>('dashboard')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding')
      const json = await res.json()
      if (json.success && json.data) {
        setRecords(json.data as DBRecord[])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // Stats
  const pendingCount = records.filter((r) => r.status === 'pending').length
  const inProgressCount = records.filter((r) => r.status === 'in_progress').length
  const submittedCount = records.filter((r) => r.status === 'submitted').length
  const approvedCount = records.filter((r) => r.status === 'approved' || r.status === 'completed' || r.status === 'reviewed').length

  // Filter
  const filtered = records.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'submitted') return r.status === 'submitted'
    if (filter === 'review-needed') {
      return (
        r.aiReview?.overallStatus === 'review-needed' ||
        r.aiReview?.overallStatus === 'fail'
      )
    }
    if (filter === 'approved') return r.status === 'approved' || r.status === 'completed' || r.status === 'reviewed'
    return true
  })

  const handleExportCSV = () => {
    window.open('/api/export-csv', '_blank')
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">人事</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">人事CREW ダッシュボード</h1>
                <p className="text-xs text-gray-400">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile view toggle */}
              <div className="flex lg:hidden gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setMobileView('dashboard')}
                  className={`p-2 rounded-md transition-colors ${
                    mobileView === 'dashboard' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMobileView('chat')}
                  className={`p-2 rounded-md transition-colors ${
                    mobileView === 'chat' ? 'bg-white shadow-sm text-teal-600' : 'text-gray-400'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300
                           text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">CSVエクスポート</span>
              </button>
              <Link
                href="/admin/new-contract"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white
                           text-sm font-bold hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新規契約を作成</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Split view: Dashboard 60% | Chat 40% */}
      <div className="flex-1 flex overflow-hidden">
        {/* Dashboard panel */}
        <div className={`flex-1 lg:w-[60%] lg:block overflow-y-auto ${
          mobileView === 'dashboard' ? 'block' : 'hidden'
        }`}>
          <main className="px-4 md:px-6 py-6 space-y-6">
            {/* Auth warning */}
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              本番環境では認証を追加してください
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="送信済み" sub="Pending" count={pendingCount} color="blue" />
              <StatCard label="進行中" sub="In Progress" count={inProgressCount} color="yellow" />
              <StatCard label="提出済み" sub="Submitted" count={submittedCount} color="amber" pulse />
              <StatCard label="承認済み" sub="Approved" count={approvedCount} color="green" />
            </div>

            {/* Filter tabs + refresh */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
                {([
                  ['all', 'すべて'],
                  ['submitted', '提出済み'],
                  ['review-needed', '要確認'],
                  ['approved', '承認済み'],
                ] as [FilterTab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filter === key
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchRecords}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className={`h-4 w-20 ${i >= 3 ? 'hidden md:block' : ''}`} />
                  ))}
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border-b border-gray-50">
                    <SkeletonRow cols={6} />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-sm">データがありません</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-500">氏名</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">ポジション</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">雇用形態</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">入社日</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">提出日</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">ステータス</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">AIレビュー</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{r.contract?.employeeName || '—'}</p>
                            <p className="text-xs text-gray-400 md:hidden">{r.contract?.position || ''}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700 hidden md:table-cell">{r.contract?.position || '—'}</td>
                          <td className="px-4 py-3 text-slate-700 hidden lg:table-cell">
                            {EMPLOYMENT_LABELS[r.contract?.employmentType] || r.contract?.employmentType || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 hidden lg:table-cell">{r.contract?.startDate || '—'}</td>
                          <td className="px-4 py-3 text-slate-700 hidden md:table-cell">
                            {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('ja-JP') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="px-4 py-3">
                            <AIReviewBadge aiReview={r.aiReview} />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/review/${r.token}`}
                              className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 font-medium text-sm transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              詳細
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Chat panel */}
        <div className={`lg:w-[40%] lg:block ${
          mobileView === 'chat' ? 'block w-full' : 'hidden'
        }`}>
          <AgentChatPanel onRefresh={fetchRecords} />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  sub,
  count,
  color,
  pulse,
}: {
  label: string
  sub: string
  count: number
  color: 'blue' | 'yellow' | 'amber' | 'green'
  pulse?: boolean
}) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50',
    yellow: 'border-yellow-200 bg-yellow-50',
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-green-200 bg-green-50',
  }
  const textColors = {
    blue: 'text-blue-700',
    yellow: 'text-yellow-700',
    amber: 'text-amber-700',
    green: 'text-green-700',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-sm font-medium ${textColors[color]}`}>{label}</p>
        {pulse && count > 0 && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{count}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  )
}
