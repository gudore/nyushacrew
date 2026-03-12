'use client'

import { useState } from 'react'

interface Option {
  value: string
  label: string
  description?: string
  icon?: string
}

interface OptionCardProps {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  allowCustom?: boolean
  customLabel?: string
  customPlaceholder?: string
}

export default function OptionCard({
  options,
  value,
  onChange,
  allowCustom = true,
  customLabel = 'その他 / Other',
  customPlaceholder = '入力してください...',
}: OptionCardProps) {
  const CUSTOM_KEY = '__custom__'
  const predefinedValues = options.map((o) => o.value)
  const isCustomSelected =
    value !== null && !predefinedValues.includes(value) && value !== ''
  const [customMode, setCustomMode] = useState(isCustomSelected)
  const [customText, setCustomText] = useState(isCustomSelected ? value ?? '' : '')

  const selectedValue = customMode ? CUSTOM_KEY : value

  function handleSelect(val: string) {
    if (val === CUSTOM_KEY) {
      setCustomMode(true)
      onChange(customText)
    } else {
      setCustomMode(false)
      setCustomText('')
      onChange(val)
    }
  }

  function handleCustomInput(text: string) {
    setCustomText(text)
    onChange(text)
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`
              relative flex flex-col items-center gap-2 rounded-xl border-2 p-4
              transition-all duration-200 cursor-pointer text-center
              hover:border-amber-300 hover:shadow-sm
              ${
                selectedValue === opt.value
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }
            `}
          >
            {opt.icon && <span className="text-3xl">{opt.icon}</span>}
            <span className="font-bold text-sm text-gray-800">{opt.label}</span>
            {opt.description && (
              <span className="text-xs text-gray-500">{opt.description}</span>
            )}
          </button>
        ))}

        {allowCustom && (
          <button
            type="button"
            onClick={() => handleSelect(CUSTOM_KEY)}
            className={`
              relative flex flex-col items-center gap-2 rounded-xl border-2 p-4
              transition-all duration-200 cursor-pointer text-center
              hover:border-amber-300 hover:shadow-sm
              ${
                selectedValue === CUSTOM_KEY
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }
            `}
          >
            <span className="text-3xl">✏️</span>
            <span className="font-bold text-sm text-gray-800">{customLabel}</span>
          </button>
        )}
      </div>

      {customMode && (
        <div className="mt-3">
          <input
            type="text"
            value={customText}
            onChange={(e) => handleCustomInput(e.target.value)}
            placeholder={customPlaceholder}
            className="w-full rounded-lg border-2 border-amber-300 bg-white px-4 py-2.5
                       text-sm text-gray-800 placeholder-gray-400
                       focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200
                       transition-colors duration-200"
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
