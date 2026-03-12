'use client'

import ContractChat from '@/components/admin/ContractChat'

export default function NewContractPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">新規契約書作成</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create New Contract</p>
          </div>
          <a
            href="/admin/dashboard"
            className="text-sm text-teal-700 hover:text-teal-900 font-medium"
          >
            ← ダッシュボード
          </a>
        </div>
      </header>

      <ContractChat />
    </div>
  )
}
