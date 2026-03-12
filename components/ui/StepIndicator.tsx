'use client'

import { Check } from 'lucide-react'

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <>
      {/* Desktop: horizontal stepper */}
      <div className="hidden md:flex items-center w-full">
        {steps.map((label, i) => {
          const isCompleted = i < currentStep
          const isCurrent = i === currentStep

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex items-center justify-center w-9 h-9 rounded-full
                    text-sm font-bold transition-colors duration-300
                    ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                          ? 'bg-amber-500 text-white'
                          : 'border-2 border-gray-300 text-gray-400 bg-white'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : i + 1}
                </div>
                <span
                  className={`
                    mt-1.5 text-xs text-center whitespace-nowrap
                    ${
                      isCompleted
                        ? 'text-green-600 font-medium'
                        : isCurrent
                          ? 'text-amber-600 font-bold'
                          : 'text-gray-400'
                    }
                  `}
                >
                  {label}
                </span>
              </div>

              {i < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 mt-[-1rem] transition-colors duration-300
                    ${i < currentStep ? 'bg-green-400' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: compact bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-bold text-gray-700">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-amber-600 font-medium">{steps[currentStep]}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  )
}
