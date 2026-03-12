'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Send,
  FileText,
  Copy,
  CheckCircle,
  RotateCcw,
  Bot,
  User,
} from 'lucide-react'
import OptionCard from '@/components/ui/OptionCard'
import AINote from '@/components/ui/AINote'
import {
  CHAT_STEPS,
  getDisplayLabel,
  nextMsgId,
  type ChatMessage,
  type ChatStep,
} from '@/lib/chat-steps'

// ── Types ──────────────────────────────────────────────

interface SummaryResult {
  summaryText: string
  warnings: string[]
}

// ── Component ──────────────────────────────────────────

export default function ContractChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [collectedData, setCollectedData] = useState<Record<string, string>>({})
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summary, setSummary] = useState<SummaryResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [successUrl, setSuccessUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  // ── Scroll to bottom ──────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }, 50)
  }, [])

  // ── Add assistant message ─────────────────────────────
  const addAssistantMessage = useCallback(
    (step: ChatStep) => {
      const msg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: step.message,
        ui: step.ui,
      }
      setMessages((prev) => [...prev, msg])
      scrollToBottom()
    },
    [scrollToBottom]
  )

  // ── Find next non-skipped step ────────────────────────
  const findNextStep = useCallback(
    (fromIndex: number, data: Record<string, string>): number => {
      let i = fromIndex
      while (i < CHAT_STEPS.length) {
        const step = CHAT_STEPS[i]
        if (step.skipIf && step.skipIf(data)) {
          i++
          continue
        }
        return i
      }
      return i // past end
    },
    []
  )

  // ── Initialize with greeting + first question ─────────
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const greetingStep = CHAT_STEPS[0]
    addAssistantMessage(greetingStep)

    // Auto-advance past greeting to first real step
    const nextIdx = findNextStep(1, {})
    setTimeout(() => {
      setStepIndex(nextIdx)
      if (nextIdx < CHAT_STEPS.length) {
        addAssistantMessage(CHAT_STEPS[nextIdx])
      }
    }, 600)
  }, [addAssistantMessage, findNextStep])

  // ── Focus input when step changes ─────────────────────
  useEffect(() => {
    if (stepIndex < CHAT_STEPS.length) {
      const step = CHAT_STEPS[stepIndex]
      if (step.ui?.type === 'text' || step.ui?.type === 'number' || step.ui?.type === 'date') {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
  }, [stepIndex, messages.length])

  // ── Build contract payload ────────────────────────────
  function buildPayload() {
    return {
      employeeName: collectedData.employeeName?.trim() ?? '',
      employeeNameKana: collectedData.employeeNameKana?.trim() ?? '',
      employeeEmail: collectedData.employeeEmail?.trim() ?? '',
      employeePhone: collectedData.employeePhone?.trim() || undefined,
      position: collectedData.position?.trim() ?? '',
      department: collectedData.department ?? '',
      employmentType: collectedData.employmentType ?? '',
      startDate: collectedData.startDate ?? '',
      endDate: collectedData.endDate || undefined,
      salaryType: collectedData.salaryType ?? '',
      salary: Number(collectedData.salary) || 0,
      weeklyHours: collectedData.weeklyHours || undefined,
      paymentDate: collectedData.paymentDate ?? '',
      workLocation: collectedData.workLocation?.trim() ?? '',
      workHours: collectedData.workHours ?? '',
      trialPeriod: collectedData.trialPeriod ?? '',
      benefits: [],
    }
  }

  // ── Advance to next step ──────────────────────────────
  function advanceStep(value: string, currentData: Record<string, string>) {
    const step = CHAT_STEPS[stepIndex]

    // Add user message
    const displayValue = getDisplayLabel(step.field, value) || value || '（スキップ）'
    setMessages((prev) => [
      ...prev,
      {
        id: nextMsgId(),
        role: 'user',
        content: displayValue,
      },
    ])

    const nextIdx = findNextStep(stepIndex + 1, currentData)
    setStepIndex(nextIdx)

    if (nextIdx < CHAT_STEPS.length) {
      const nextStep = CHAT_STEPS[nextIdx]
      if (nextStep.field === '__confirm') {
        // Confirmation step — fetch AI summary
        setTimeout(() => {
          addAssistantMessage({
            ...nextStep,
            message: '入力お疲れ様でした！内容を確認しています...',
          })
          fetchSummary(currentData)
        }, 300)
      } else {
        setTimeout(() => addAssistantMessage(nextStep), 300)
      }
    }

    setInputValue('')
    setInputError(null)
    scrollToBottom()
  }

  // ── Handle user submit ────────────────────────────────
  function handleSubmitValue(value: string) {
    const step = CHAT_STEPS[stepIndex]

    // Validate
    if (step.validate) {
      const err = step.validate(value)
      if (err) {
        setInputError(err)
        return
      }
    }

    const transformed = step.transform ? step.transform(value) : value
    const newData = { ...collectedData, [step.field]: transformed }
    setCollectedData(newData)
    advanceStep(transformed, newData)
  }

  // ── Handle option select ──────────────────────────────
  function handleOptionSelect(value: string) {
    handleSubmitValue(value)
  }

  // ── Handle text/number/date submit ────────────────────
  function handleInputSubmit() {
    handleSubmitValue(inputValue)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleInputSubmit()
    }
  }

  // ── Rewind to step ────────────────────────────────────
  function handleRewind(messageIndex: number) {
    // Find the user message and figure out which step it corresponds to
    const userMessages = messages
      .map((m, i) => ({ msg: m, idx: i }))
      .filter((m) => m.msg.role === 'user')

    const clickedUserMsg = userMessages.find((m) => m.idx === messageIndex)
    if (!clickedUserMsg) return

    const userMsgPosition = userMessages.indexOf(clickedUserMsg)

    // Count how many actual data steps we had (skipping greeting)
    let dataStepCount = 0
    let targetStepIndex = 1 // Start after greeting
    const tempData: Record<string, string> = {}

    for (let i = 1; i < CHAT_STEPS.length && dataStepCount < userMsgPosition; i++) {
      const step = CHAT_STEPS[i]
      if (step.skipIf && step.skipIf(tempData)) continue
      if (step.field.startsWith('__')) continue
      // This was a real data step the user answered
      const fieldValue = collectedData[step.field]
      if (fieldValue !== undefined) {
        tempData[step.field] = fieldValue
      }
      dataStepCount++
      targetStepIndex = i + 1
    }

    // Find the actual target step (the one being rewound to)
    const rewindToStepIdx = findNextStep(targetStepIndex, tempData)

    // Truncate messages to before the clicked user message
    setMessages((prev) => prev.slice(0, messageIndex))

    // Reset collected data for fields at and after the rewind point
    const newData = { ...tempData }
    setCollectedData(newData)

    // Set step and re-add assistant message
    setStepIndex(rewindToStepIdx)
    if (rewindToStepIdx < CHAT_STEPS.length) {
      setTimeout(() => addAssistantMessage(CHAT_STEPS[rewindToStepIdx]), 100)
    }

    setSummary(null)
    setSuccessUrl(null)
    setInputValue('')
    setInputError(null)
  }

  // ── Fetch AI summary ──────────────────────────────────
  async function fetchSummary(data: Record<string, string>) {
    setSummaryLoading(true)
    try {
      const payload = {
        employeeName: data.employeeName?.trim() ?? '',
        employeeNameKana: data.employeeNameKana?.trim() ?? '',
        employeeEmail: data.employeeEmail?.trim() ?? '',
        employeePhone: data.employeePhone?.trim() || undefined,
        position: data.position?.trim() ?? '',
        department: data.department ?? '',
        employmentType: data.employmentType ?? '',
        startDate: data.startDate ?? '',
        endDate: data.endDate || undefined,
        salaryType: data.salaryType ?? '',
        salary: Number(data.salary) || 0,
        weeklyHours: data.weeklyHours || undefined,
        paymentDate: data.paymentDate ?? '',
        workLocation: data.workLocation?.trim() ?? '',
        workHours: data.workHours ?? '',
        trialPeriod: data.trialPeriod ?? '',
        benefits: [],
      }

      const res = await fetch('/api/chat-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractData: payload }),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      setSummary(result)
    } catch {
      toast.error('AI要約の取得に失敗しました')
      // Still allow send without summary
      setSummary({ summaryText: '（AI要約を取得できませんでした）', warnings: [] })
    } finally {
      setSummaryLoading(false)
      scrollToBottom()
    }
  }

  // ── Preview PDF ───────────────────────────────────────
  async function handlePreview() {
    setPreviewLoading(true)
    try {
      const res = await fetch('/api/generate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) throw new Error('PDF生成に失敗しました')
      const blob = await res.blob()
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      toast.error('PDF生成に失敗しました')
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Send contract ─────────────────────────────────────
  async function handleSend() {
    setSendLoading(true)
    try {
      const res = await fetch('/api/onboarding/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setSuccessUrl(result.onboardingUrl)
      toast.success('契約書を送信しました')

      // Add success message
      setMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: 'assistant',
          content: `送信完了しました！以下のリンクを従業員に共有してください。`,
          ui: { type: 'success' },
        },
      ])
      scrollToBottom()
    } catch {
      toast.error('送信に失敗しました')
    } finally {
      setSendLoading(false)
    }
  }

  // ── Copy URL ──────────────────────────────────────────
  async function handleCopy() {
    if (!successUrl) return
    await navigator.clipboard.writeText(successUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Reset for new contract ────────────────────────────
  function handleReset() {
    setMessages([])
    setStepIndex(0)
    setCollectedData({})
    setInputValue('')
    setInputError(null)
    setSummary(null)
    setSummaryLoading(false)
    setPreviewLoading(false)
    setSendLoading(false)
    setSuccessUrl(null)
    setCopied(false)
    initialized.current = false

    // Re-trigger initialization
    setTimeout(() => {
      initialized.current = true
      const greetingStep = CHAT_STEPS[0]
      setMessages([
        {
          id: nextMsgId(),
          role: 'assistant',
          content: greetingStep.message,
          ui: greetingStep.ui,
        },
      ])
      const nextIdx = findNextStep(1, {})
      setTimeout(() => {
        setStepIndex(nextIdx)
        if (nextIdx < CHAT_STEPS.length) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextMsgId(),
              role: 'assistant',
              content: CHAT_STEPS[nextIdx].message,
              ui: CHAT_STEPS[nextIdx].ui,
            },
          ])
        }
      }, 600)
    }, 100)
  }

  // ── Determine current step UI type ────────────────────
  const currentStep = stepIndex < CHAT_STEPS.length ? CHAT_STEPS[stepIndex] : null
  const showInputBar =
    currentStep &&
    !successUrl &&
    (currentStep.ui?.type === 'text' ||
      currentStep.ui?.type === 'number' ||
      currentStep.ui?.type === 'date')
  const isConfirmStep = currentStep?.field === '__confirm'

  // ── Render ────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-73px)]">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={msg.id} className="animate-[slideIn_0.3s_ease-out]">
              {msg.role === 'assistant' ? (
                <AssistantBubble message={msg} />
              ) : (
                <UserBubble
                  message={msg}
                  onClick={() => !successUrl && handleRewind(idx)}
                  rewindable={!successUrl}
                />
              )}

              {/* Render interactive UI below assistant message */}
              {msg.role === 'assistant' &&
                idx === messages.length - 1 &&
                !successUrl &&
                msg.ui?.type === 'options' && (
                  <div className="ml-10 mt-2">
                    <OptionCard
                      options={
                        msg.ui.options?.map((o) => ({
                          value: o.value,
                          label: o.label,
                          icon: o.icon,
                        })) ?? []
                      }
                      value={null}
                      onChange={handleOptionSelect}
                      allowCustom={msg.ui.allowCustom ?? false}
                      customPlaceholder={msg.ui.placeholder}
                    />
                  </div>
                )}
            </div>
          ))}

          {/* Typing indicator */}
          {summaryLoading && (
            <div className="animate-[slideIn_0.3s_ease-out]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-teal-700" />
                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <span
                      className="w-2 h-2 bg-teal-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary card */}
          {isConfirmStep && summary && !summaryLoading && (
            <div className="ml-10 space-y-3 animate-[slideIn_0.3s_ease-out]">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-teal-600" />
                  AI確認サマリー
                  <span className="text-xs text-gray-400 font-normal">AI Summary</span>
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {summary.summaryText}
                </p>
              </div>

              {summary.warnings.length > 0 && (
                <div className="space-y-2">
                  {summary.warnings.map((w, i) => (
                    <AINote key={i} type="warning" message={w} />
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewLoading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                             border-2 border-teal-600 text-teal-700 font-medium text-sm
                             hover:bg-teal-50 disabled:opacity-50 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  {previewLoading ? '生成中...' : '契約書プレビュー'}
                </button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sendLoading}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                             bg-amber-500 text-white font-bold text-sm
                             hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sendLoading ? '送信中...' : 'この内容で送信'}
                </button>
              </div>
            </div>
          )}

          {/* Success section */}
          {successUrl && (
            <div className="ml-10 space-y-3 animate-[slideIn_0.3s_ease-out]">
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800 text-sm">送信完了</span>
                  <span className="text-xs text-green-600">Contract Sent</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">共有リンク / Onboarding URL</p>
                <p className="text-sm font-mono text-slate-700 break-all bg-white rounded-lg p-3 border border-green-100">
                  {successUrl}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      コピーしました
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      リンクをコピー
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                             border-2 border-gray-300 text-gray-600 font-medium text-sm
                             hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  新しい契約を作成
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom input bar */}
      {showInputBar && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="max-w-2xl mx-auto">
            {inputError && (
              <p className="text-xs text-red-500 mb-1.5">{inputError}</p>
            )}
            <div className="flex gap-2">
              {currentStep.ui?.prefix && (
                <span className="flex items-center text-gray-500 font-medium text-sm pl-1">
                  {currentStep.ui.prefix}
                </span>
              )}
              <input
                ref={inputRef}
                type={
                  currentStep.ui?.type === 'date'
                    ? 'date'
                    : currentStep.ui?.type === 'number'
                      ? 'number'
                      : currentStep.ui?.inputType || 'text'
                }
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setInputError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder={currentStep.ui?.placeholder}
                min={currentStep.ui?.type === 'number' ? '0' : undefined}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-4
                           text-sm text-slate-800 placeholder-gray-400
                           focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                           transition-colors min-h-[3.5rem]"
              />
              <button
                type="button"
                onClick={handleInputSubmit}
                className="rounded-lg bg-teal-600 text-white px-4 py-2.5
                           hover:bg-teal-700 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-teal-700" />
      </div>
      <div className="bg-teal-50 border border-teal-100 rounded-2xl rounded-tl-sm px-4 py-3 max-w-lg">
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

function UserBubble({
  message,
  onClick,
  rewindable,
}: {
  message: ChatMessage
  onClick: () => void
  rewindable: boolean
}) {
  return (
    <div className="flex justify-end items-start gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={!rewindable}
        className={`bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-4 py-3 max-w-lg text-left
                    ${rewindable ? 'hover:border-amber-300 hover:shadow-sm cursor-pointer group' : ''}`}
        title={rewindable ? 'クリックしてここからやり直す' : undefined}
      >
        <p className="text-sm text-slate-700">{message.content}</p>
        {rewindable && (
          <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            クリックでやり直し
          </p>
        )}
      </button>
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-gray-500" />
      </div>
    </div>
  )
}
