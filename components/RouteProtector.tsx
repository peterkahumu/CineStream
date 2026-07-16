'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function RouteProtector({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isProtected, setIsProtected] = useState(false)

  useEffect(() => {
    const checkProtection = () => {
      const accepted = document.cookie.split('; ').find(row => row.startsWith('cinemaphora_terms='))?.split('=')[1] === 'true'
      const isUnprotected = pathname === '/terms' || pathname === '/privacy' || pathname === '/declined' || pathname === '/'
      
      if (!accepted && !isUnprotected) {
        router.push('/declined')
        setIsProtected(true)
      } else {
        setIsProtected(false)
      }
    }

    checkProtection()
    window.addEventListener('termsAccepted', checkProtection)
    return () => window.removeEventListener('termsAccepted', checkProtection)
  }, [pathname, router])

  // Optional: return null while redirecting to avoid a flash of protected content
  if (isProtected) return null

  return <>{children}</>
}
