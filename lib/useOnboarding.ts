'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ContractData, PersonalData, OnboardingRecord } from '@/lib/types'

interface UseOnboardingReturn {
  loading: boolean
  error: string | null
  record: OnboardingRecord | null
  contract: ContractData | null
  collectedData: Partial<PersonalData>
  setCollectedData: React.Dispatch<React.SetStateAction<Partial<PersonalData>>>
  signature: string | null
  setSignature: (sig: string) => void
}

export function useOnboarding(token: string): UseOnboardingReturn {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [record, setRecord] = useState<OnboardingRecord | null>(null)
  const [collectedData, setCollectedData] = useState<Partial<PersonalData>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoad = useRef(true)

  // Fetch onboarding record
  useEffect(() => {
    async function fetchRecord() {
      try {
        const res = await fetch(`/api/onboarding/${token}`)
        const json = await res.json()
        if (!json.success) {
          setError(json.error || 'Failed to load')
          return
        }
        const data = json.data as OnboardingRecord
        setRecord(data)
        if (data.personal) {
          setCollectedData(data.personal)
        }
        if (data.signature) {
          setSignature(data.signature)
        }
      } catch {
        setError('データの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }
    fetchRecord()
  }, [token])

  // Auto-save with 1-second debounce
  const save = useCallback(
    async (data: Partial<PersonalData>) => {
      try {
        await fetch(`/api/onboarding/${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personal: data, status: 'in_progress' }),
        })
      } catch {
        // Silent fail — auto-save is best-effort
      }
    },
    [token],
  )

  useEffect(() => {
    // Skip auto-save on initial load / empty data
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    if (Object.keys(collectedData).length === 0) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(collectedData), 1000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [collectedData, save])

  const contract = record ? (record.contract as ContractData) : null

  return {
    loading,
    error,
    record,
    contract,
    collectedData,
    setCollectedData,
    signature,
    setSignature,
  }
}
