'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, Sparkles } from 'lucide-react'
import ToolActionCard from '@/components/admin/ToolActionCard'
import type { AgentChatMessage, AgentToolCall, AgentSSEEvent } from '@/lib/types'

const QUICK_ACTIONS = [
  '新規契約を作成',
  '提出済みを確認',
  'CSVエクスポート',
  '統計を表示',
]

interface AgentChatPanelProps {
  onRefresh?: () => void
}

export default function AgentChatPanel({ onRefresh }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: AgentChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Build messages array for API (only role + content)
    const apiMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const assistantId = crypto.randomUUID()
    let assistantContent = ''
    const toolCalls: AgentToolCall[] = []

    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', toolCalls: [] },
    ])

    try {
      const res = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok) {
        throw new Error('チャットAPIのエラー')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('ストリーム取得失敗')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          let event: AgentSSEEvent
          try {
            event = JSON.parse(jsonStr)
          } catch {
            continue
          }

          if (event.type === 'text_delta' && event.text) {
            assistantContent += event.text
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              )
            )
          } else if (event.type === 'tool_start') {
            const tc: AgentToolCall = {
              id: event.toolCallId || crypto.randomUUID(),
              name: event.name || '',
              input: event.input || {},
              status: 'running',
            }
            toolCalls.push(tc)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m
              )
            )
          } else if (event.type === 'tool_result') {
            const idx = toolCalls.findIndex((tc) => tc.id === event.toolCallId)
            if (idx !== -1) {
              toolCalls[idx] = {
                ...toolCalls[idx],
                status: event.error ? 'error' : 'completed',
                result: event.result,
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m
                )
              )
              // Trigger dashboard refresh when data-mutating tools complete
              if (
                !event.error &&
                ['create_contract', 'update_status'].includes(event.name || '')
              ) {
                onRefresh?.()
              }
            }
          } else if (event.type === 'error') {
            assistantContent += `\n\nエラー: ${event.error}`
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              )
            )
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'エラーが発生しました'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: assistantContent || errorMsg }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [isLoading, messages, onRefresh])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-white">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">AI アシスタント</h2>
          <p className="text-xs text-gray-400">自然言語で契約作成・管理</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">AIアシスタントにお任せください</p>
              <p className="text-xs text-gray-400 mt-1">
                自然な日本語で指示するだけで契約作成や管理ができます
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => sendMessage(action)}
                  className="px-3 py-1.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700
                             text-xs font-medium hover:bg-teal-100 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-teal-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-slate-800 rounded-bl-md'
              }`}
            >
              {/* Tool calls */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="space-y-1">
                  {msg.toolCalls.map((tc) => (
                    <ToolActionCard
                      key={tc.id}
                      name={tc.name}
                      status={tc.status}
                      input={tc.input}
                      result={tc.result}
                    />
                  ))}
                </div>
              )}

              {/* Text content */}
              {msg.content && (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}

              {/* Loading state */}
              {msg.role === 'assistant' && !msg.content && (!msg.toolCalls || msg.toolCalls.length === 0) && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions (shown when there are messages) */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              className="shrink-0 px-2.5 py-1 rounded-full border border-gray-200 bg-white
                         text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="指示を入力... 例: 田中太郎の契約を作成"
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm
                       placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500
                       focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
