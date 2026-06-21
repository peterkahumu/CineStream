'use client'
import { useState, useEffect } from 'react'

const KEY = 'tmdbApiKey'

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(KEY) || ''
      setApiKeyState(saved)
    } catch {}
  }, [])

  const setApiKey = (key: string) => {
    setApiKeyState(key)
    try {
      if (key) localStorage.setItem(KEY, key)
      else localStorage.removeItem(KEY)
    } catch {}
  }

  return { apiKey, setApiKey, mounted, hasKey: !!apiKey }
}
