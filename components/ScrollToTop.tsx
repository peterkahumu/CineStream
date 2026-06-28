'use client'

import { useEffect } from 'react'

export default function ScrollToTop() {
  useEffect(() => {
    // When this component mounts, scroll to the top of the window
    window.scrollTo(0, 0)
  }, [])
  return null
}
