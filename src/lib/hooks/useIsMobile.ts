import { useEffect, useState } from 'react'

export default function useIsMobile(breakpointPx: number = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpointPx)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpointPx])

  return isMobile
} 