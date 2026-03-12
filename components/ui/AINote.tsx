'use client'

import { Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'

interface AINoteProps {
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  field?: string
}

const config = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-800',
    Icon: AlertTriangle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800',
    Icon: XCircle,
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800',
    Icon: CheckCircle,
  },
} as const

export default function AINote({ type, message, field }: AINoteProps) {
  const { bg, border, text, badge, Icon } = config[type]

  return (
    <div
      className={`
        flex items-start gap-3 rounded-lg border px-4 py-3
        animate-[slideIn_0.3s_ease-out]
        ${bg} ${border}
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${text}`} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {field && (
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
            {field}
          </span>
        )}
        <span className={text}>{message}</span>
      </div>
    </div>
  )
}
