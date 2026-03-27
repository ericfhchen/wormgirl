import { useEffect, useRef, useState } from 'react'

/**
 * Full-page pre-loader overlay that simulates loading over 2 seconds.
 * The bar animates to 90 % in ~1.8 s, then waits for both `window.load`
 * AND the intro video to be ready. Once both fire, it completes to 100 %,
 * fades out, and unmounts itself.
 */
export default function PreLoader() {
  const [progress, setProgress] = useState(0)          // 0 – 100
  const [isClosing, setIsClosing] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const rafId = useRef<number>()
  // Next time (in ms timestamp) when we are allowed to visually update the bar.
  const nextUpdateRef = useRef<number>(0)
  // Use refs so the rAF loop always sees the latest values without restarting
  const isReadyRef = useRef(false)
  const startRef = useRef(performance.now())

  // Detect when the page has fully loaded (all assets)
  useEffect(() => {
    let pageLoaded = document.readyState === 'complete'
    let videoReady = false

    const check = () => {
      if (pageLoaded && videoReady) isReadyRef.current = true
    }

    const handleLoad = () => { pageLoaded = true; check() }
    const handleVideoReady = () => { videoReady = true; check() }

    if (pageLoaded) check()

    window.addEventListener('load', handleLoad)
    window.addEventListener('intro-video-ready', handleVideoReady)

    return () => {
      window.removeEventListener('load', handleLoad)
      window.removeEventListener('intro-video-ready', handleVideoReady)
    }
  }, [])

  // Single animation loop — never restarts
  useEffect(() => {
    const TOTAL_MS = 2000

    const step = (now: number) => {
      const elapsed = now - startRef.current

      // Normalised progress purely from elapsed time (0–1)
      const timeFrac = elapsed / TOTAL_MS

      // Clamp progress: up to 90 % until both page loaded AND video ready, then up to 100 %.
      let frac: number
      if (isReadyRef.current) {
        frac = Math.min(1, timeFrac)
      } else {
        frac = Math.min(0.9, timeFrac)
      }

      // Stagger visual updates to mimic network buffering, especially for Safari.
      // Only commit a new width value at randomised intervals (80-200 ms).
      const nowMs = performance.now()
      if (nowMs >= nextUpdateRef.current || frac === 1) {
        nextUpdateRef.current = nowMs + 80 + Math.random() * 120 // next window
        // Round to an integer percentage for more visible jumps
        setProgress(Math.round(frac * 100))
      }

      // Continue animating while progress < 100 %
      if (frac < 1) {
        rafId.current = requestAnimationFrame(step)
        return
      }

      // At this point we have BOTH: ready && >= TOTAL_MS elapsed
      // Ensure bar is full, hold briefly, then begin fade
      const HOLD_MS = 700
      const FADE_MS = 400
      setProgress(100)

      // 1. Hold the bar fully visible
      setTimeout(() => {
        // 2. Start fade-out
        setIsClosing(true)

        // 3. Remove component after fade completes
        setTimeout(() => {
          setIsHidden(true)
        }, FADE_MS)
      }, HOLD_MS)
    }

    rafId.current = requestAnimationFrame(step)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  // Unmount once fully closed
  if (isHidden) return null

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-dark z-[9999]"
      style={{
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
        pointerEvents: 'none',
      }}
    >
      {/* Logo */}
      <img
        src="/WORMGIRL_LOGOMARK_FINAL.svg"
        alt="Worm Girl Logo"
        className="w-48 h-auto mb-6"
      />

      {/* Progress bar */}
      <div className="w-56 h-2 bg-light/30 overflow-hidden rounded-full border border-light">
        <div className="h-full bg-light transition-[width] duration-300 ease-in-out" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}
