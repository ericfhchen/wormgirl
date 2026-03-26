
'use client'

import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import attachHls from '@/lib/attachHls'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'
import useIsMobile from '@/lib/hooks/useIsMobile'
import { timecodeToSeconds } from '@/lib/timecode'

// Helper utilities shared with other players
const getVideoPlaybackId = (video: any) => {
  return (
    video?.asset?.playbackId ||
    video?.playbackId ||
    video?.asset?.data?.playback_ids?.[0]?.id ||
    video?.data?.playback_ids?.[0]?.id ||
    null
  )
}

const getVideoUrl = (module: any) => {
  const playbackId = getVideoPlaybackId(module?.video)
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
}

// Get the mainEnd timestamp in seconds — parses video end timecode and subtracts 3s (the baked idle section)
const IDLE_LOOP_DURATION = 3
const getMainEnd = (module: any): number | null => {
  const endTime = timecodeToSeconds(module?.videoEndTimecode)
  if (endTime === null) return null
  return endTime - IDLE_LOOP_DURATION
}

export default function VideoPlayerStacked() {
  const { state: videoState, dispatch, playModule } = useVideo()
  const { state: modulesState } = useModules()
  const {
    isModulePage,
    state: pageState,
    setModulePage,
    isContentPanelExpanded,
  } = usePageState() // eslint-disable-line @typescript-eslint/no-unused-vars
  const isMobile = useIsMobile()
  const buttonDuration = 500

  // ----- Dynamic offset for Next Chapter button relative to mobile module bar -----
  const [barGap, setBarGap] = useState<number | null>(null)
  const barObserverRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!isMobile) return

    const updateGap = () => {
      const barEl = document.getElementById('mobile-module-bar')
      if (!barEl) return

      const rect = barEl.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const offset = viewportHeight - rect.top
      setBarGap(offset + 16)
    }

    updateGap()

    let attempts = 0
    const intervalId = window.setInterval(() => {
      updateGap()
      attempts += 1
      if (attempts >= 10) {
        clearInterval(intervalId)
      }
    }, 150)

    const barEl = document.getElementById('mobile-module-bar')
    if (barEl && 'ResizeObserver' in window) {
      barObserverRef.current = new ResizeObserver(updateGap)
      barObserverRef.current.observe(barEl)
    }

    window.addEventListener('resize', updateGap)
    window.addEventListener('orientationchange', updateGap)
    window.addEventListener('scroll', updateGap, true)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('resize', updateGap)
      window.removeEventListener('orientationchange', updateGap)
      window.removeEventListener('scroll', updateGap, true)
      barObserverRef.current?.disconnect()
      barObserverRef.current = null
    }
  }, [isMobile])

  // Local debug toggle – press "d" to show/hide overlay
  const [showDebug, setShowDebug] = useState(false)

  // One ref per module video
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])


  // Cache modules list & indices early so all hooks can use them safely
  const modules = modulesState.modules
  const currentIndex = videoState.currentModuleIndex

  // Track previous index to detect non-sequential jumps
  const prevIndexRef = useRef<number>(-1)
  const [shouldFade, setShouldFade] = useState(false)
  const [fadePhase, setFadePhase] = useState<'idle' | 'out' | 'in'>('idle')
  // Synchronous ref mirror of shouldFade — used in useEffect to avoid stale closures
  const isFadingRef = useRef(false)
  // Tracks whether the fade-out has started (distinguishes pre-out idle from post-in idle)
  const fadeStartedRef = useRef(false)

  // Control Next Chapter button visibility with delayed show after idle starts
  const [buttonVisible, setButtonVisible] = useState(false)

  // Current module info
  const currentModule = currentIndex >= 0 && currentIndex < modules.length ? modules[currentIndex] : null
  const mainEnd = currentModule ? getMainEnd(currentModule) : null

  // Debug: log mainEnd parsing on module change
  useEffect(() => {
    if (currentModule) {
      console.log('[StackedPlayer] videoEndTimecode:', currentModule.videoEndTimecode, '→ mainEnd:', mainEnd)
    }
  }, [currentIndex])

  // Hide button on module change, then (re-)schedule delayed show if we're in idle mode
  useEffect(() => {
    let t: number | undefined
    setButtonVisible(false)

    if (videoState.isIdle && pageState.contentPanelStage !== 'hidden') {
      t = window.setTimeout(() => setButtonVisible(true), 1000)
    }

    return () => {
      if (t) clearTimeout(t)
    }
  }, [currentIndex, videoState.isIdle])

  // Still respond to idle mode toggles when module index remains unchanged
  useEffect(() => {
    let t: number | undefined
    if (videoState.isIdle && pageState.contentPanelStage !== 'hidden') {
      t = window.setTimeout(() => setButtonVisible(true), 1000)
    } else {
      setButtonVisible(false)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [videoState.isIdle])

  // Show button when content panel opens (keep visible if panel closes)
  useEffect(() => {
    if (!videoState.isIdle) return

    let t: number | undefined

    if (pageState.contentPanelStage !== 'hidden') {
      t = window.setTimeout(() => setButtonVisible(true), 300)
    }

    return () => {
      if (t) clearTimeout(t)
    }
  }, [pageState.contentPanelStage])

  // ----- Idle loop: keep video looping between mainEnd and end -----
  useEffect(() => {
    if (!videoState.isIdle || currentIndex < 0) return
    const ref = videoRefs.current[currentIndex]
    if (ref && ref.paused) {
      ref.play().catch(() => {})
    }
  }, [videoState.isIdle, currentIndex])

  // Track that the next module switch originated from idle (suppresses fade in useLayoutEffect)
  const switchFromIdleRef = useRef(false)

  // Helper: perform the queued module switch at loop boundary
  const flushQueuedModule = () => {
    const queuedIdx = videoState.queuedModuleIndex
    if (queuedIdx === null) return false

    const ref = videoRefs.current[currentIndex]
    try { ref?.pause() } catch {}

    switchFromIdleRef.current = true
    dispatch({ type: 'SET_MODULE', payload: queuedIdx })
    dispatch({ type: 'PLAY' })
    dispatch({ type: 'QUEUE_MODULE', payload: null })
    return true
  }

  // Helper to build debug overlay data
  const buildDebugInfo = () => {
    const ref = videoRefs.current[currentIndex]
    return {
      currentIndex,
      prevIndex: prevIndexRef.current,
      fadePhase,
      shouldFade,
      isPlaying: videoState.isPlaying,
      isIdle: videoState.isIdle,
      mainEnd,
      queuedModuleIndex: videoState.queuedModuleIndex,
      videos: modules.map((m, idx) => {
        const vref = videoRefs.current[idx]
        return {
          idx,
          title: m?.title,
          mainEnd: getMainEnd(m),
          readyState: vref?.readyState,
          paused: vref?.paused,
          currentTime: vref?.currentTime?.toFixed?.(2),
          duration: vref?.duration?.toFixed?.(2),
        }
      }),
    }
  }

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'd') {
        setShowDebug((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Log high-level state changes
  useEffect(() => {
    console.log('[StackedPlayer] moduleIndex', videoState.currentModuleIndex, {
      isIdle: videoState.isIdle,
      isPlaying: videoState.isPlaying,
    })
  }, [videoState.currentModuleIndex, videoState.isIdle, videoState.isPlaying])

  // Detect sequential vs non-sequential navigation BEFORE paint to avoid flashes
  useLayoutEffect(() => {
    if (currentIndex === -1) return

    const prev = prevIndexRef.current

    if (prev === -1) {
      if (currentIndex === 0) {
        // First load to Prelude – show instantly, no fade needed
        prevIndexRef.current = currentIndex
        setShouldFade(false)
        isFadingRef.current = false
        fadeStartedRef.current = false
        return
      }

      // First load BUT jumping directly to a later module → treat as non-sequential
      setShouldFade(true)
      isFadingRef.current = true
      fadeStartedRef.current = true
      setFadePhase('out')

      dispatch({ type: 'SET_IDLE', payload: false })

      // Seek new module to its mainEnd (freeze point)
      const ref = videoRefs.current[currentIndex]
      const modMainEnd = getMainEnd(modules[currentIndex])
      const firstDur = ref?.duration
      const effectiveMainEnd = modMainEnd ?? (firstDur && firstDur !== Infinity && firstDur > IDLE_LOOP_DURATION ? firstDur - IDLE_LOOP_DURATION : null)
      if (ref && effectiveMainEnd !== null) {
        try { ref.currentTime = effectiveMainEnd } catch {}
      }

      const outDuration = 300
      const inDuration = 300
      const inDelay = outDuration + 20

      const t1 = setTimeout(() => {
        if (effectiveMainEnd !== null) dispatch({ type: 'SET_IDLE', payload: true })
        setFadePhase('in')
      }, inDelay)

      const t2 = setTimeout(() => {
        setFadePhase('idle')
      }, inDelay + inDuration)

      const t3 = setTimeout(() => {
        setShouldFade(false)
        isFadingRef.current = false
        fadeStartedRef.current = false
        prevIndexRef.current = currentIndex
      }, inDelay + inDuration + outDuration)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }

    const isSequentialForward = currentIndex === prev + 1
    const fromIdle = switchFromIdleRef.current
    switchFromIdleRef.current = false

    if (!isSequentialForward && !fromIdle) {
      // Non-sequential jump while NOT from idle — fade-to-black covers the cut
      setShouldFade(true)
      isFadingRef.current = true
      fadeStartedRef.current = true
      setFadePhase('out')

      dispatch({ type: 'SET_IDLE', payload: false })

      // Seek new module to its mainEnd (freeze point)
      const ref = videoRefs.current[currentIndex]
      const modMainEnd = getMainEnd(modules[currentIndex])
      const dur = ref?.duration
      const effectiveMainEnd = modMainEnd ?? (dur && dur !== Infinity && dur > IDLE_LOOP_DURATION ? dur - IDLE_LOOP_DURATION : null)
      if (ref && effectiveMainEnd !== null) {
        try { ref.currentTime = effectiveMainEnd } catch {}
      }

      const outDuration = 300
      const inDuration = 300
      const inDelay = outDuration + 20

      const t1 = setTimeout(() => {
        if (effectiveMainEnd !== null) dispatch({ type: 'SET_IDLE', payload: true })
        setFadePhase('in')
      }, inDelay)

      const t2 = setTimeout(() => {
        setFadePhase('idle')
      }, inDelay + inDuration)

      const t3 = setTimeout(() => {
        setShouldFade(false)
        isFadingRef.current = false
        fadeStartedRef.current = false
        prevIndexRef.current = currentIndex
      }, inDelay + inDuration + outDuration)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    } else {
      // Sequential navigation OR transition from idle — no fade, instant switch
      setShouldFade(false)
      isFadingRef.current = false
      fadeStartedRef.current = false
      if (videoState.isIdle) dispatch({ type: 'SET_IDLE', payload: false })
      prevIndexRef.current = currentIndex
    }
  }, [currentIndex])

  // Ensure refs array always matches module count
  useEffect(() => {
    if (modules.length === 0) return
    videoRefs.current = Array.from({ length: modules.length }, (_, i) => videoRefs.current[i] ?? null)
  }, [modules.length])

  // Attach HLS streams whenever video elements or sources change
  useEffect(() => {
    modules.forEach((m, idx) => {
      const url = getVideoUrl(m)
      const vid = videoRefs.current[idx]
      if (url && vid) {
        attachHls(vid, url)
      }
    })
  }, [modules])

  // Play / pause management when current module or playback state changes
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= modules.length) return

    const fading = isFadingRef.current

    const activeRef = videoRefs.current[currentIndex]
    if (activeRef) {
      if (!fading && (videoState.isPlaying || videoState.isIdle)) {
        console.log('[StackedPlayer] play/pause effect: playing module', currentIndex, 'readyState:', activeRef.readyState, 'currentTime:', activeRef.currentTime)
        activeRef.play().catch(console.error)
      } else {
        console.log('[StackedPlayer] play/pause effect: pausing module', currentIndex, 'fading:', fading, 'isPlaying:', videoState.isPlaying, 'isIdle:', videoState.isIdle)
        activeRef.pause()
      }
    } else {
      console.log('[StackedPlayer] play/pause effect: NO activeRef for module', currentIndex)
    }

    // Pause and rewind all non-active refs
    videoRefs.current.forEach((ref: HTMLVideoElement | null, idx: number) => {
      if (!ref || idx === currentIndex) return
      // During a fade, keep the previous module at its current frame for the fade-out
      if (fading && idx === prevIndexRef.current) {
        ref.pause()
        return
      }
      ref.pause()
      try { ref.currentTime = 0 } catch {}
    })

    // Prime the *next* sequential video so its first frame is decoded
    if (!fading && videoState.isPlaying) {
      const nextIdx = currentIndex + 1
      const nextRef = videoRefs.current[nextIdx]
      if (nextRef && nextRef.readyState < 2) {
        nextRef.muted = true
        nextRef.play()
          .then(() => {
            nextRef.pause()
            try { nextRef.currentTime = 0 } catch {}
          })
          .catch(() => {})
      }
    }
  }, [currentIndex, videoState.isPlaying, videoState.isIdle, shouldFade])

  // Pause previous video immediately when a non-sequential fade starts
  useLayoutEffect(() => {
    if (fadePhase === 'out') {
      const prevRef = videoRefs.current[prevIndexRef.current]
      if (prevRef) {
        try { prevRef.pause() } catch {}
      }
    }
  }, [fadePhase])

  // Sync duration and currentTime for the current main video
  const handleLoadedMetadata = (idx: number) => {
    const ref = videoRefs.current[idx]
    if (ref && idx === currentIndex) {
      const modMainEnd = getMainEnd(modules[idx])
      dispatch({ type: 'SET_DURATION', payload: modMainEnd ?? ref.duration })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleTimeUpdate = (idx: number) => {
    if (idx !== currentIndex) return
    const ref = videoRefs.current[idx]
    if (!ref) return

    const ct = ref.currentTime
    const dur = ref.duration

    if (videoState.isIdle) {
      // --- IDLE MODE: loop between mainEnd and end of video ---
      const modMainEnd = getMainEnd(modules[idx])
      const effectiveMainEnd = modMainEnd ?? (dur && dur !== Infinity && dur > IDLE_LOOP_DURATION ? dur - IDLE_LOOP_DURATION : null)
      if (effectiveMainEnd !== null) {
        const nearEnd = dur && dur !== Infinity && dur - ct < 0.15 && !ref.seeking
        if (nearEnd) {
          // If a module is queued, switch now instead of looping
          if (flushQueuedModule()) return

          console.log('[StackedPlayer] idle nearEnd, seeking to', effectiveMainEnd)
          try {
            if ((ref as any).fastSeek) {
              (ref as any).fastSeek(effectiveMainEnd)
            } else {
              ref.currentTime = effectiveMainEnd + 0.001
            }
            ref.play().catch(() => {})
          } catch {}
        }
      }
      return
    }

    dispatch({ type: 'SET_TIME', payload: ct })

    const modMainEnd = getMainEnd(modules[idx])
    const effectiveMainEnd = modMainEnd ?? (dur && dur !== Infinity && dur > IDLE_LOOP_DURATION ? dur - IDLE_LOOP_DURATION : null)

    if (effectiveMainEnd !== null && ct >= effectiveMainEnd - 0.1) {
      console.log('[StackedPlayer] entering idle mode at', ct, 'mainEnd:', effectiveMainEnd)
      dispatch({ type: 'SET_IDLE', payload: true })
    }
  }

  // Handle video ending
  const handleEnded = (idx: number) => {
    if (idx !== currentIndex) return
    const ref = videoRefs.current[idx]

    if (videoState.isIdle && ref) {
      // If a module is queued, switch now instead of looping
      if (flushQueuedModule()) return

      // Loop back to idle start
      const modMainEnd = getMainEnd(modules[idx])
      const dur = ref.duration
      const effectiveMainEnd = modMainEnd ?? (dur && dur !== Infinity && dur > IDLE_LOOP_DURATION ? dur - IDLE_LOOP_DURATION : null)
      if (effectiveMainEnd !== null) {
        try {
          ref.currentTime = effectiveMainEnd
          ref.play().catch(() => {})
        } catch {}
      }
    } else if (!videoState.isIdle) {
      console.log('[StackedPlayer] video ended, entering idle')
      dispatch({ type: 'SET_IDLE', payload: true })
    }
  }

  // Safari sometimes silently pauses HLS at boundaries
  const handlePause = (idx: number) => {
    if (idx !== currentIndex || isFadingRef.current) return
    if (!videoState.isPlaying && !videoState.isIdle) return
    const ref = videoRefs.current[idx]
    if (!ref) return
    window.requestAnimationFrame(() => {
      if (ref && ref.paused && (videoState.isPlaying || videoState.isIdle)) {
        try { ref.play().catch(() => {}) } catch {}
      }
    })
  }

  // No modules yet – show placeholder
  if (modules.length === 0 || currentIndex === -1) {
    console.log('[StackedPlayer] rendering black placeholder. modules:', modules.length, 'currentIndex:', currentIndex)
    return <div className="relative w-full h-full bg-black" />
  }

  console.log('[StackedPlayer] rendering video elements. currentIndex:', currentIndex, 'shouldFade:', shouldFade, 'fadePhase:', fadePhase)

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden"
    >
      {modules.map((module, idx) => {
        const videoUrl = getVideoUrl(module)
        if (!videoUrl) return null
        return (
          <video
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            data-module-video={idx}
            ref={(el: HTMLVideoElement | null) => {
              videoRefs.current[idx] = el
              if (el && videoUrl) {
                if (idx === 0) console.log('[StackedPlayer] ref callback: module 0 video element mounted, attaching HLS')
                attachHls(el, videoUrl)
              }
            }}
            preload="auto"
            muted
            playsInline
            crossOrigin="anonymous"
            className="absolute top-0 left-0 w-full h-full object-cover"
            style={{
              opacity: (() => {
                const prevIdx = prevIndexRef.current
                const inTransition = prevIdx !== currentIndex
                  && !(prevIdx === -1 && currentIndex === 0)

                if (inTransition || shouldFade) {
                  let val: number
                  if (fadePhase === 'out') val = idx === prevIdx ? 1 : 0
                  else if (fadePhase === 'in') val = idx === currentIndex ? 1 : 0
                  else if (fadeStartedRef.current) val = idx === currentIndex ? 1 : 0
                  else val = idx === prevIdx ? 1 : 0
                  return val
                }
                if (idx !== currentIndex) return 0
                return 1
              })(),
              zIndex: idx + 1,
              objectPosition: !isMobile && isContentPanelExpanded ? 'calc(50% - 90px) 50%' : '50% 50%',
              transition: shouldFade || fadePhase !== 'idle'
                ? 'opacity 0.3s ease-in-out, object-position 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                : 'object-position 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onLoadedMetadata={() => handleLoadedMetadata(idx)}
            onTimeUpdate={() => handleTimeUpdate(idx)}
            onEnded={() => handleEnded(idx)}
            onPause={() => handlePause(idx)}
            onLoadStart={() => dispatch({ type: 'SET_LOADING', payload: true })}
            onError={(e: any) => {
              console.error('Video error', e)
              dispatch({ type: 'SET_LOADING', payload: false })
            }}
          />
        )
      })}

      {/* Black overlay — always in DOM so CSS transitions work */}
      <div
        data-loop-overlay
        className="absolute top-0 left-0 w-full h-full bg-black"
        style={{
          opacity: shouldFade && fadePhase !== 'idle' ? 1 : 0,
          zIndex: modules.length + 3,
          transition: 'opacity 0.3s ease-in-out',
          pointerEvents: 'none',
        }}
      />

      {/* Next Chapter button (shown only during idle playback) */}
      {currentIndex < modules.length - 1 && (
        <button
          type="button"
          onClick={() => {
            setButtonVisible(false)
            playModule(currentIndex + 1)
            const nextModule = modules[currentIndex + 1]
            if (nextModule?.slug?.current) {
              setModulePage(currentIndex + 1, nextModule.slug.current)
            }
          }}
          className="absolute bg-black text-light font-serif font-normal text-xs tracking-wide uppercase border-light border hover:bg-light hover:text-black transition-transform ease-in-out px-5 py-2 z-[9999]"
          style={{
            left: '50%',
            bottom: '1rem',
            transform: (() => {
              if (isMobile) return 'translateX(-50%)'
              const sidebarOffset = 90
              const panelOffset = isContentPanelExpanded ? 192 : 0
              return `translateX(calc(-50% - ${sidebarOffset + panelOffset}px))`
            })(),
            opacity: buttonVisible ? 1 : 0,
            transition: shouldFade
              ? 'none'
              : `transform ${buttonDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${buttonDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            pointerEvents: buttonVisible ? 'auto' : 'none',
          }}
        >
          Next Chapter
        </button>
      )}

      {/* Debug overlay */}
      {showDebug && (
        <pre className="absolute bottom-0 left-0 w-full max-h-60 overflow-auto bg-black/70 text-green-300 text-xs p-2 z-[9999]">
          {JSON.stringify(buildDebugInfo(), null, 2)}
        </pre>
      )}
    </div>
  )
}
