import { useEffect, useState } from 'react'

export default function useIsMobile(breakpointPx: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < breakpointPx
  })

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpointPx)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpointPx])

  return isMobile
} 