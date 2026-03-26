'use client'

import { useEffect, useRef, useState } from 'react'
import attachHls from '@/lib/attachHls'
import { client } from '@/lib/sanity'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'
import useIsMobile from '@/lib/hooks/useIsMobile'
import { timecodeToSeconds } from '@/lib/timecode'

const SIDEBAR_OFFSET_CLASS = 'w-full lg:w-[calc(100vw-180px)]'

// GROQ query to fetch the singleton intro document
const IDLE_LOOP_DURATION = 3

const INTRO_QUERY = `*[_type == "intro"][0]{
  video { asset-> { playbackId } },
  videoEndTimecode,
  buttonLabel
}`

function getPlaybackId(video: any): string | null {
  return (
    video?.asset?.playbackId ||
    video?.playbackId ||
    video?.asset?.data?.playback_ids?.[0]?.id ||
    video?.data?.playback_ids?.[0]?.id ||
    null
  )
}

export default function IntroOverlay({ onFinish }: { onFinish: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [mainEnd, setMainEnd] = useState<number | null>(null)
  const [buttonLabel, setButtonLabel] = useState('PRELUDE')
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const { state: videoState, dispatch } = useVideo()
  const { state: modulesState } = useModules()
  const { setModulePage, isContentPanelExpanded } = usePageState()
  const isMobile = useIsMobile()

  // Debug overlay (press 'd' to toggle)
  const [showDebug, setShowDebug] = useState(false)

  // Fallback: if video never becomes ready (e.g. iOS Safari autoplay issues),
  // show the button anyway after a timeout so the user isn't stuck.
  const [fallbackReady, setFallbackReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setFallbackReady(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  const buttonShouldShow = isIdle && (isVideoReady || fallbackReady) && !isClosing && !modulesState.loading && modulesState.modules.length > 0

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'd') setShowDebug(prev => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // When entering idle, ensure video keeps playing (it loops between mainEnd and end)
  useEffect(() => {
    if (isIdle && videoRef.current) {
      const vid = videoRef.current
      if (vid.paused) {
        vid.play().catch(() => {})
      }
    }
  }, [isIdle])

  // Fetch intro settings from Sanity once
  useEffect(() => {
    client
      .fetch(INTRO_QUERY)
      .then((data) => {
        console.log('[IntroOverlay] Sanity data:', JSON.stringify(data, null, 2))
        const pid = getPlaybackId(data?.video)
        console.log('[IntroOverlay] playbackId:', pid)
        if (pid) setVideoUrl(`https://stream.mux.com/${pid}.m3u8`)
        const endTime = data?.videoEndTimecode != null ? timecodeToSeconds(data.videoEndTimecode) : null
        const parsedMainEnd = endTime !== null ? endTime - IDLE_LOOP_DURATION : null
        console.log('[IntroOverlay] videoEndTimecode:', data?.videoEndTimecode, '→ endTime:', endTime, '→ mainEnd:', parsedMainEnd)
        if (parsedMainEnd !== null) setMainEnd(parsedMainEnd)
        if (data?.buttonLabel) setButtonLabel(data.buttonLabel)
      })
      .catch(console.error)
  }, [])

  // Track whether we're waiting for the idle loop to finish before transitioning
  const pendingTransitionRef = useRef(false)
  // Ref mirror of isClosing — avoids stale closures in event handlers
  const isClosingRef = useRef(false)

  // Wait for a target video element to render a visible frame, then call cb.
  // Keeps the overlay on screen until the underlying video is actually painted.
  // The element may not exist in the DOM yet (VideoPlayerStacked renders nothing
  // when currentIndex === -1), so we poll for it first.
  const waitForFrameThenFinish = (targetIdx: number) => {
    const TIMEOUT = 3000
    const startTime = performance.now()

    console.log('[IntroOverlay] waitForFrameThenFinish: starting for module', targetIdx)

    const finish = () => {
      console.log('[IntroOverlay] waitForFrameThenFinish: finishing — removing overlay. Elapsed:', (performance.now() - startTime).toFixed(0), 'ms')
      onFinish()
    }

    // Step 1: find the element (may need to wait for React to render it)
    const findAndWait = () => {
      const el = document.querySelector<HTMLVideoElement>(
        `[data-module-video="${targetIdx}"]`
      )

      if (!el) {
        if (performance.now() - startTime > TIMEOUT) {
          console.warn('[IntroOverlay] waitForFrameThenFinish: TIMEOUT waiting for element to appear in DOM')
          finish()
          return
        }
        console.log('[IntroOverlay] waitForFrameThenFinish: element not in DOM yet, polling...')
        requestAnimationFrame(findAndWait)
        return
      }

      console.log('[IntroOverlay] waitForFrameThenFinish: element found. readyState:', el.readyState, 'paused:', el.paused, 'currentTime:', el.currentTime)

      // Step 2: ensure it's playing so it can decode
      el.play().catch(() => {})

      // Step 3: wait for an actual composited frame
      if ('requestVideoFrameCallback' in (el as any)) {
        console.log('[IntroOverlay] waitForFrameThenFinish: using requestVideoFrameCallback')
        const t = setTimeout(() => {
          console.warn('[IntroOverlay] waitForFrameThenFinish: TIMEOUT waiting for requestVideoFrameCallback')
          finish()
        }, TIMEOUT - (performance.now() - startTime))
        ;(el as any).requestVideoFrameCallback(() => {
          console.log('[IntroOverlay] waitForFrameThenFinish: requestVideoFrameCallback fired. readyState:', el.readyState, 'currentTime:', el.currentTime)
          clearTimeout(t)
          finish()
        })
      } else if (!el.paused && el.readyState >= 3) {
        console.log('[IntroOverlay] waitForFrameThenFinish: already has data, using rAF')
        requestAnimationFrame(finish)
      } else {
        console.log('[IntroOverlay] waitForFrameThenFinish: waiting for playing event')
        const t = setTimeout(() => {
          el.removeEventListener('playing', onPlaying)
          console.warn('[IntroOverlay] waitForFrameThenFinish: TIMEOUT waiting for playing event')
          finish()
        }, TIMEOUT - (performance.now() - startTime))
        const onPlaying = () => {
          console.log('[IntroOverlay] waitForFrameThenFinish: playing event fired. readyState:', el.readyState)
          clearTimeout(t)
          requestAnimationFrame(finish)
        }
        el.addEventListener('playing', onPlaying, { once: true })
      }
    }

    findAndWait()
  }

  // Close overlay when a non-sequential module is selected from sidebar
  useEffect(() => {
    if (videoState.currentModuleIndex < 0 || isClosing) return
    // Sequential (prelude) is handled by the pendingTransition flow, not here
    if (videoState.currentModuleIndex === 0) return

    isClosingRef.current = true
    setIsClosing(true)
    setTimeout(onFinish, 500)
  }, [videoState.currentModuleIndex])

  // Attach HLS once we have a URL and ref
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      attachHls(videoRef.current, videoUrl)
    }
  }, [videoUrl])

  // Autoplay when ready
  const handleCanPlay = () => {
    setIsVideoReady(true)
    if (videoRef.current) {
      videoRef.current.play().catch(() => {/* ignore */})
    }
  }

  const handleTimeUpdate = () => {
    const vid = videoRef.current
    if (!vid) return

    const ct = vid.currentTime
    const dur = vid.duration

    if (isIdle && mainEnd !== null) {
      // --- IDLE MODE: loop between mainEnd and end of video ---
      const nearEnd = dur && dur !== Infinity && dur - ct < 0.15 && !vid.seeking
      if (nearEnd) {
        if (pendingTransitionRef.current) {
          // Loop finished — switch to module 0, keep overlay visible until frame paints
          console.log('[IntroOverlay] nearEnd + pendingTransition: dispatching SET_MODULE 0. ct:', ct, 'dur:', dur)
          pendingTransitionRef.current = false
          vid.pause()
          dispatch({ type: 'SET_MODULE', payload: 0 })
          dispatch({ type: 'PLAY' })
          const firstModule = modulesState.modules[0]
          if (firstModule?.slug?.current) {
            setModulePage(0, firstModule.slug.current)
          }
          waitForFrameThenFinish(0)
          return
        }
        console.log('[IntroOverlay] nearEnd detected (no pending), seeking to mainEnd:', mainEnd, 'ct:', ct, 'dur:', dur)
        try {
          if ((vid as any).fastSeek) {
            (vid as any).fastSeek(mainEnd)
          } else {
            vid.currentTime = mainEnd + 0.001
          }
          vid.play().catch(() => {})
        } catch {}
      }
    } else {
      // --- MAIN CONTENT MODE: playing the zoom-in ---
      if (mainEnd !== null && ct >= mainEnd - 0.1 && !isIdle) {
        console.log('[IntroOverlay] entering idle mode at', ct, 'mainEnd:', mainEnd)
        setIsIdle(true)
      }
    }
  }

  // Handle video ending
  const handleEnded = () => {
    const vid = videoRef.current
    if (!vid) return

    if (pendingTransitionRef.current) {
      // Loop finished via ended event — switch to module 0, keep overlay until frame paints
      pendingTransitionRef.current = false
      dispatch({ type: 'SET_MODULE', payload: 0 })
      dispatch({ type: 'PLAY' })
      const firstModule = modulesState.modules[0]
      if (firstModule?.slug?.current) {
        setModulePage(0, firstModule.slug.current)
      }
      waitForFrameThenFinish(0)
      return
    }

    if (isIdle && mainEnd !== null) {
      // Loop back to idle start
      try {
        vid.currentTime = mainEnd
        vid.play().catch(() => {})
      } catch {}
    }
  }

  // Safari sometimes silently pauses HLS at boundaries
  const handlePause = () => {
    const vid = videoRef.current
    if (!vid || isClosingRef.current || pendingTransitionRef.current) return
    window.requestAnimationFrame(() => {
      if (vid && vid.paused && !isClosingRef.current) {
        try { vid.play().catch(() => {}) } catch {}
      }
    })
  }

  // Click handler for the intro button — queue the transition for end of idle loop
  const handleClick = () => {
    console.log('[IntroOverlay] PRELUDE clicked — queuing transition. currentTime:', videoRef.current?.currentTime, 'duration:', videoRef.current?.duration, 'mainEnd:', mainEnd)
    pendingTransitionRef.current = true
    isClosingRef.current = true
    setIsClosing(true) // disable button immediately
  }

  // Non-sequential close (sidebar pick) fades to black; sequential (prelude) stays visible until unmount
  const isNonSequentialClose = isClosing && videoState.currentModuleIndex > 0
  const overlayStyle = {
    opacity: isNonSequentialClose ? 0 : 1,
    transition: isNonSequentialClose ? 'opacity 0.5s ease-in-out' : 'none',
    pointerEvents: isClosing ? 'none' : 'auto',
  } as React.CSSProperties

  return (
    <div className={`fixed top-0 left-0 h-full ${SIDEBAR_OFFSET_CLASS} z-[15] flex items-center justify-center`} style={overlayStyle}>
      {/* Video layer */}
      {videoUrl && (
        <video
          ref={videoRef}
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPause={handlePause}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: isVideoReady ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
        />
      )}

      {/* Prelude button — shown only during idle loop */}
      <button
        type="button"
        onClick={handleClick}
        className="absolute bg-black text-light font-serif font-normal text-xs tracking-wide uppercase border-light border hover:bg-light hover:text-black transition-all duration-150 ease-in-out px-5 py-2"
        style={{
          left: '50%',
          bottom: '1rem',
          transform: (() => {
            if (isMobile) return 'translateX(-50%)'
            const sidebarOffset = 0
            const panelOffset = isContentPanelExpanded ? 192 : 0
            return `translateX(calc(-50% - ${sidebarOffset + panelOffset}px))`
          })(),
          opacity: buttonShouldShow ? 1 : 0,
          transition: 'opacity 0.6s ease-in-out',
          pointerEvents: buttonShouldShow ? 'auto' : 'none',
        }}
      >
        {buttonLabel || 'PRELUDE'}
      </button>

      {/* Debug overlay — press 'd' to toggle */}
      {showDebug && videoRef.current && (
        <div className="absolute top-2 left-2 z-50 bg-black/80 text-green-400 font-mono text-xs p-3 rounded pointer-events-none max-w-xs">
          <div className="font-bold text-white mb-1">IntroOverlay Debug</div>
          <div>isIdle: <span className="text-yellow-300">{String(isIdle)}</span></div>
          <div>mainEnd: {mainEnd?.toFixed(2) ?? 'null'}</div>
          <div>currentTime: {videoRef.current.currentTime?.toFixed(4)}</div>
          <div>duration: {videoRef.current.duration?.toFixed(4)}</div>
          <div>paused: {String(videoRef.current.paused)}</div>
          <div>readyState: {videoRef.current.readyState}</div>
          <div>isClosing: {String(isClosing)}</div>
          <div>moduleIndex: {videoState.currentModuleIndex}</div>
        </div>
      )}
    </div>
  )
}
