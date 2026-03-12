'use client'

import { use, useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useOnboarding } from '@/lib/useOnboarding'
import type { PersonalData } from '@/lib/types'
import StepIndicator from '@/components/ui/StepIndicator'
import ContractViewer from '@/components/employee/ContractViewer'
import SignaturePad from '@/components/employee/SignaturePad'
import DocumentUploader from '@/components/employee/DocumentUploader'
import ForeignerDocUploader from '@/components/employee/ForeignerDocUploader'
import CommuteSelector from '@/components/employee/CommuteSelector'
import FamilyDataForm from '@/components/employee/FamilyDataForm'
import EmergencyContactForm from '@/components/employee/EmergencyContactForm'
import ReviewSubmit from '@/components/employee/ReviewSubmit'

const BASE_STEPS = [
  '契約確認',
  '署名',
  '個人情報',
  '通勤情報',
  '家族情報',
  '緊急連絡先',
  '確認・送信',
]

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const {
    loading,
    error,
    record,
    contract,
    collectedData,
    setCollectedData,
    signature,
    setSignature,
  } = useOnboarding(token)
  const [currentStep, setCurrentStep] = useState(0)

  // Dynamic steps: insert 在留カード after 個人情報 for non-Japanese
  const isForeigner = collectedData.nationality !== undefined && collectedData.nationality !== '日本'
  const steps = useMemo(() => {
    if (isForeigner) {
      const s = [...BASE_STEPS]
      s.splice(3, 0, '在留カード')
      return s
    }
    return BASE_STEPS
  }, [isForeigner])

  const advance = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }, [steps.length])

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  const merge = useCallback(
    (data: Record<string, unknown>) => {
      setCollectedData((prev) => ({ ...prev, ...data }))
      advance()
    },
    [setCollectedData, advance],
  )

  // --- Loading state ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">読み込み中...</p>
        </div>
      </div>
    )
  }

  // --- Error / not found ---
  if (error || !record || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto px-6">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800 mt-4">このリンクは無効です</h1>
          <p className="text-sm text-gray-400 mt-1">This link is invalid</p>
          <p className="text-gray-500 text-sm mt-4">
            リンクが正しいかご確認ください。問題が続く場合は担当者にお問い合わせください。
          </p>
        </div>
      </div>
    )
  }

  // --- Already submitted ---
  if (record.status === 'submitted' || record.status === 'reviewed' || record.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto px-6">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-800 mt-4">提出済みです</h1>
          <p className="text-sm text-gray-400 mt-1">Already submitted</p>
          <p className="text-gray-500 text-sm mt-4">
            オンボーディングの情報は既に提出されています。変更が必要な場合は担当者にご連絡ください。
          </p>
        </div>
      </div>
    )
  }

  // --- Resolve which step component to show ---
  const stepLabel = steps[currentStep]

  // contract is guaranteed non-null here (early return above handles null case)
  const contractData = contract!

  function renderStep() {
    switch (stepLabel) {
      case '契約確認':
        return <ContractViewer token={token} onComplete={advance} />
      case '署名':
        return (
          <SignaturePad
            token={token}
            onComplete={(sig) => {
              setSignature(sig)
              advance()
            }}
          />
        )
      case '個人情報':
        return <DocumentUploader onComplete={merge} />
      case '在留カード':
        return <ForeignerDocUploader onComplete={merge} />
      case '通勤情報':
        return (
          <CommuteSelector
            address={collectedData.address ? formatAddress(collectedData.address) : undefined}
            workLocation={contractData.workLocation}
            onComplete={merge}
          />
        )
      case '家族情報':
        return <FamilyDataForm onComplete={merge} />
      case '緊急連絡先':
        return <EmergencyContactForm onComplete={merge} />
      case '確認・送信':
        return <ReviewSubmit token={token} contract={contractData} personal={collectedData} />
      default:
        return null
    }
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Logo placeholder */}
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">人事</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-800 leading-tight">人事CREW</h1>
                <p className="text-xs text-gray-400">Onboarding</p>
              </div>
            </div>
            {contract.employeeName && (
              <p className="text-sm text-slate-600 font-medium hidden sm:block">
                {contract.employeeName} 様
              </p>
            )}
          </div>
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>
      </header>

      {/* ── Content area ── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 md:px-6 py-8 pb-28 md:pb-8">
        <div className="animate-[slideIn_0.3s_ease-out]" key={currentStep}>
          {renderStep()}
        </div>
      </main>

      {/* ── Bottom navigation ── */}
      {!isLastStep && (
        <nav className="fixed bottom-0 left-0 right-0 md:static bg-white border-t border-gray-200 md:border-0 p-4 pb-safe md:py-6">
          <div className="max-w-2xl mx-auto flex gap-3">
            {!isFirstStep && (
              <button
                onClick={goBack}
                className="flex items-center justify-center gap-1 px-5 py-3 rounded-lg
                           border border-gray-300 text-gray-600 font-medium
                           hover:bg-gray-50 transition-colors md:w-auto"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>
                  戻る <span className="text-xs text-gray-400">Back</span>
                </span>
              </button>
            )}
            <button
              onClick={advance}
              className={`flex items-center justify-center gap-1 px-5 py-3 rounded-lg
                         bg-amber-500 text-white font-bold
                         hover:bg-amber-600 transition-colors
                         ${isFirstStep ? 'flex-1 md:flex-none' : 'flex-1'}`}
            >
              <span>
                次へ <span className="text-xs text-amber-100">Next</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

function formatAddress(addr: PersonalData['address']): string {
  if (!addr) return ''
  return [addr.prefecture, addr.city, addr.street, addr.building].filter(Boolean).join(' ')
}
