'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import attachHls from '@/lib/attachHls'
import { client } from '@/lib/sanity'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'
import useIsMobile from '@/lib/hooks/useIsMobile'
import { timecodeToSeconds } from '@/lib/timecode'

const SIDEBAR_OFFSET_CLASS = 'w-full lg:w-[calc(100vw-180px)]'
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
  const [blackOverlay, setBlackOverlay] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [pendingPrelude, setPendingPrelude] = useState(false)
  const { state: videoState, dispatch, playModule, introPreludeRef: pendingPreludeRef } = useVideo()
  const { state: modulesState } = useModules()
  const { setModulePage, isContentPanelExpanded } = usePageState()
  const isMobile = useIsMobile()

  // Debug overlay (press 'd' to toggle)
  const [showDebug, setShowDebug] = useState(false)

  // Fallback: if video never becomes ready, show button anyway after timeout
  const [fallbackReady, setFallbackReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setFallbackReady(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  const buttonShouldShow = isIdle && (isVideoReady || fallbackReady) && !isClosing && !pendingPrelude && !modulesState.loading && modulesState.modules.length > 0

  // Ref mirror of isClosing — avoids stale closures in event handlers
  const isClosingRef = useRef(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'd') setShowDebug(prev => !prev)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // When entering idle, ensure video keeps playing
  useEffect(() => {
    if (isIdle && videoRef.current) {
      const vid = videoRef.current
      if (vid.paused && !isClosingRef.current) {
        vid.play().catch(() => {})
      }
    }
  }, [isIdle])

  // Fetch intro settings from Sanity once
  useEffect(() => {
    client
      .fetch(INTRO_QUERY)
      .then((data) => {
        const pid = getPlaybackId(data?.video)
        if (pid) setVideoUrl(`https://stream.mux.com/${pid}.m3u8`)
        const endTime = data?.videoEndTimecode != null ? timecodeToSeconds(data.videoEndTimecode) : null
        const parsedMainEnd = endTime !== null ? endTime - IDLE_LOOP_DURATION : null
        if (parsedMainEnd !== null) setMainEnd(parsedMainEnd)
        if (data?.buttonLabel) setButtonLabel(data.buttonLabel)
      })
      .catch(() => {})
  }, [])

  // Attach HLS once we have a URL and ref
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      attachHls(videoRef.current, videoUrl)
    }
  }, [videoUrl])

  // Wait for target module video element to have decoded frames at position 0
  const waitForVideoReady = (targetIdx: number, cb: () => void) => {
    const TIMEOUT = 5000
    const start = performance.now()

    const poll = () => {
      if (performance.now() - start > TIMEOUT) {
        cb()
        return
      }

      const el = document.querySelector<HTMLVideoElement>(
        `[data-module-video="${targetIdx}"]`
      )

      if (!el || el.readyState < 2) {
        requestAnimationFrame(poll)
        return
      }

      // Use requestVideoFrameCallback for frame-accurate readiness
      if ('requestVideoFrameCallback' in el) {
        const t = setTimeout(() => {
          cb()
        }, TIMEOUT - (performance.now() - start))
        ;(el as any).requestVideoFrameCallback(() => {
          clearTimeout(t)
          cb()
        })
      } else {
        requestAnimationFrame(cb)
      }
    }

    poll()
  }

  // Seamless prelude transition: intro's last frame matches prelude's first frame,
  // so we do an instant cut (no fade) — the prelude video is already pre-loaded behind the overlay.
  const [instantCut, setInstantCut] = useState(false)

  const triggerPreludeTransition = () => {
    if (isClosingRef.current) return
    pendingPreludeRef.current = false
    setPendingPrelude(false)
    isClosingRef.current = true
    setIsClosing(true)

    if (videoRef.current) try { videoRef.current.pause() } catch {}

    // SET_MODULE now — prelude video is pre-loaded but paused at position 0.
    // VideoPlayerStacked will make it visible and the play/pause effect will start it.
    dispatch({ type: 'SET_MODULE', payload: 0 })
    dispatch({ type: 'PLAY' })

    // Instant cut: disable CSS transition and set opacity to 0 in the same render
    setInstantCut(true)
    setOverlayOpacity(0)
    setTimeout(onFinish, 50)
  }

  // Watch for prelude request from sidebar / module bar (pendingPreludeFromIntro signal)
  useLayoutEffect(() => {
    if (!videoState.pendingPreludeFromIntro || isClosingRef.current) return
    pendingPreludeRef.current = true
    setPendingPrelude(true)
  }, [videoState.pendingPreludeFromIntro])

  // Handle transition when a NON-prelude module is selected from intro
  useLayoutEffect(() => {
    if (videoState.currentModuleIndex < 0 || isClosingRef.current) return
    // Prelude is handled via pendingPreludeFromIntro signal, not currentModuleIndex
    if (videoState.currentModuleIndex === 0) return

    // Non-prelude module: cancel any pending prelude and do normal fade-to-black
    pendingPreludeRef.current = false
    setPendingPrelude(false)
    dispatch({ type: 'SET_PENDING_PRELUDE', payload: false })
    isClosingRef.current = true
    setIsClosing(true)

    // Phase 1: Fade to black
    setBlackOverlay(true)

    // Phase 2: After black overlay is fully opaque, wait for video frames, then reveal
    const fadeToBlackMs = 350 // 300ms transition + 50ms buffer
    const t = setTimeout(() => {
      // Pause intro video (hidden behind black overlay now)
      if (videoRef.current) try { videoRef.current.pause() } catch {}

      waitForVideoReady(videoState.currentModuleIndex, () => {
        dispatch({ type: 'PLAY' })
        setOverlayOpacity(0)
        setTimeout(onFinish, 400)
      })
    }, fadeToBlackMs)

    return () => clearTimeout(t)
  }, [videoState.currentModuleIndex])

  // Autoplay when ready
  const handleCanPlay = () => {
    setIsVideoReady(true)
    // Signal PreLoader that the intro video is visible
    window.dispatchEvent(new Event('intro-video-ready'))
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    const vid = videoRef.current
    if (!vid) return

    const ct = vid.currentTime
    const dur = vid.duration

    // When prelude transition is pending, suppress idle-mode entry and loop-back.
    // Let the video play all the way to its natural end — handleEnded triggers the transition.
    if (pendingPreludeRef.current) {
      return
    }

    if (isIdle && mainEnd !== null) {
      // --- IDLE MODE: loop between mainEnd and end of video ---
      const nearEnd = dur && dur !== Infinity && dur - ct < 0.15 && !vid.seeking
      if (nearEnd) {
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
        setIsIdle(true)
      }
    }
  }

  // Handle video ending
  const handleEnded = () => {
    const vid = videoRef.current
    if (!vid) return

    // If waiting for prelude transition, trigger it now
    if (pendingPreludeRef.current) {
      triggerPreludeTransition()
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
    if (!vid || isClosingRef.current) return
    window.requestAnimationFrame(() => {
      if (vid && vid.paused && !isClosingRef.current) {
        try { vid.play().catch(() => {}) } catch {}
      }
    })
  }

  // Click handler for the PRELUDE button — uses same flow as sidebar clicks.
  // playModule(0) sets introPreludeRef synchronously before dispatching.
  const handleClick = () => {
    playModule(0)
    const firstModule = modulesState.modules[0]
    if (firstModule?.slug?.current) {
      setModulePage(0, firstModule.slug.current)
    }
  }

  return (
    <div
      className={`fixed top-0 left-0 h-full ${SIDEBAR_OFFSET_CLASS} z-[15] flex items-center justify-center`}
      style={{
        opacity: overlayOpacity,
        transition: instantCut ? 'none' : 'opacity 0.3s ease-in-out',
        pointerEvents: isClosing ? 'none' : 'auto',
      }}
    >
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

      {/* Black overlay for fade-to-black / fade-from-black transition */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'black',
          opacity: blackOverlay ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

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
          <div>pendingPrelude: <span className="text-yellow-300">{String(pendingPrelude)}</span></div>
          <div>isClosing: {String(isClosing)}</div>
          <div>blackOverlay: {String(blackOverlay)}</div>
          <div>moduleIndex: {videoState.currentModuleIndex}</div>
        </div>
      )}
    </div>
  )
}
