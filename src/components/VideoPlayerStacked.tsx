
'use client'

import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import attachHls from '@/lib/attachHls'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'
import useIsMobile from '@/lib/hooks/useIsMobile'
import type { CSSProperties } from 'react'
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

// Per-module object-position animation config.
// Simple: { start, end, driftEnd? } — single drift from start to end.
// Multi-drift: { start, end, drifts[] } — multiple sequential drift phases.
//   Each drift has: end position, driftEnd timecode, and optional driftStart timecode.
//   Drift N starts from drift N-1's end (or module start for drift 0).
//   Between drifts, position holds at the previous drift's end.
// IMPORTANT: Each module's start MUST match the previous module's (or intro's) end.
// The final end position (last drift's end, or simple end) is held during idle.
type DriftPhase = { end: [number, number]; driftEnd: string; driftStart?: string }
type ModulePosition = {
  start: [number, number]
  end: [number, number]
  driftEnd?: string
  drifts?: DriftPhase[]
}
const MODULE_POSITIONS: ModulePosition[] = [
  // Module 0 (Prelude) — start must match intro end [53, 50]
  { start: [53, 50], end: [36, 50], driftEnd: '00;00;06;12' },
  // Module 1 — start must match module 0 end [36, 50]
  { start: [36, 50], end: [60, 40], driftEnd: '00;00;06;00' },
  // Module 2 — start must match module 1 end [60, 40]
  { start: [60, 40], end: [45, 35], drifts: [
    { end: [30, 15], driftEnd: '00;00;20;00' },
    { end: [45, 35], driftStart: '00;00;24;00', driftEnd: '00;00;28;00' },
  ]},
  // Module 3 — start must match module 2 end [45, 35]
  { start: [45, 35], end: [45, 35] },
  // Module 4
  { start: [50, 50], end: [50, 50] },
  // Module 5
  { start: [50, 50], end: [50, 50] },
  // Module 6
  { start: [50, 50], end: [50, 50] },
  // Module 7
  { start: [50, 50], end: [50, 50] },
]

function lerpPosition(start: readonly number[], end: readonly number[], t: number): string {
  const clampedT = Math.max(0, Math.min(1, t))
  const x = start[0] + (end[0] - start[0]) * clampedT
  const y = start[1] + (end[1] - start[1]) * clampedT
  return `${x.toFixed(2)}% ${y.toFixed(2)}%`
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

  // Local debug toggle – press "d" to show/hide overlay
  const [showDebug, setShowDebug] = useState(false)

  // One ref per module video
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  // Per-module animated object-position (mobile only) — updated directly on DOM to avoid re-renders
  const videoPositionsRef = useRef<string[]>([])


  // Cache modules list & indices early so all hooks can use them safely
  const modules = modulesState.modules
  const currentIndex = videoState.currentModuleIndex

  // Track previous index to detect non-sequential jumps
  const prevIndexRef = useRef<number>(-1)
  // Counter incremented in useLayoutEffect to force a synchronous re-render before paint
  // when the sequential/fromIdle path updates prevIndexRef (a ref alone won't trigger re-render)
  const [, setRenderTick] = useState(0)
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

  // rAF loop for smooth 60fps object-position drift (mobile only)
  useEffect(() => {
    if (!isMobile) return

    let rafId: number
    const tick = () => {
      for (let i = 0; i < modules.length; i++) {
        const ref = videoRefs.current[i]
        const pos = MODULE_POSITIONS[i]
        if (!ref || !pos) continue

        // Only animate the active module
        if (i !== currentIndex) continue

        const ct = ref.currentTime
        const dur = ref.duration
        let posStr: string

        if (pos.drifts && pos.drifts.length > 0) {
          // Multi-drift: walk through phases to find the active one
          let from: readonly number[] = pos.start
          posStr = lerpPosition(from, from, 0) // default: hold at start

          for (let d = 0; d < pos.drifts.length; d++) {
            const drift = pos.drifts[d]
            const driftStartSec = drift.driftStart ? timecodeToSeconds(drift.driftStart) : (d === 0 ? 0 : null)
            const driftEndSec = timecodeToSeconds(drift.driftEnd)

            if (driftStartSec === null || driftEndSec === null || driftEndSec <= 0) {
              from = drift.end
              continue
            }

            if (ct < driftStartSec) {
              // Before this drift starts — hold at current from position
              posStr = lerpPosition(from, from, 0)
              break
            } else if (ct >= driftStartSec && ct < driftEndSec) {
              // Inside this drift phase
              const phaseDuration = driftEndSec - driftStartSec
              const linear = Math.min((ct - driftStartSec) / phaseDuration, 1)
              const eased = linear * linear * linear
              posStr = lerpPosition(from, drift.end, eased)
              break
            } else {
              // Past this drift — hold at its end, move to next phase
              from = drift.end
              posStr = lerpPosition(from, from, 0)
            }
          }
        } else {
          // Simple single drift
          const driftEndSec = pos.driftEnd ? timecodeToSeconds(pos.driftEnd) : null
          const modMainEnd = getMainEnd(modules[i])
          const endPoint = driftEndSec ?? modMainEnd ?? (dur && dur !== Infinity && dur > IDLE_LOOP_DURATION ? dur - IDLE_LOOP_DURATION : null)

          const linear = endPoint && endPoint > 0 ? Math.min(ct / endPoint, 1) : 0
          const eased = linear * linear * linear
          posStr = lerpPosition(pos.start, pos.end, eased)
        }

        videoPositionsRef.current[i] = posStr
        ref.style.objectPosition = posStr
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isMobile, currentIndex, modules])

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
  // Guard against double-flush (timeUpdate + onEnded can both fire for the same boundary)
  const flushedRef = useRef(false)
  // Reset guard when a new module is queued
  useEffect(() => {
    if (videoState.queuedModuleIndex !== null) flushedRef.current = false
  }, [videoState.queuedModuleIndex])

  // Helper: perform the queued module switch at loop boundary
  const flushQueuedModule = (source?: string) => {
    const queuedIdx = videoState.queuedModuleIndex
    if (queuedIdx === null || flushedRef.current) return false
    flushedRef.current = true

    const isSeq = queuedIdx === currentIndex + 1

    const ref = videoRefs.current[currentIndex]
    try { ref?.pause() } catch {}

    // Only suppress fade for sequential forward jumps — non-sequential needs fade-to-black
    switchFromIdleRef.current = isSeq
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

  // Detect sequential vs non-sequential navigation BEFORE paint to avoid flashes
  useLayoutEffect(() => {
    if (currentIndex === -1) return

    const prev = prevIndexRef.current
    if (prev === -1) {
      // Coming from intro — IntroOverlay handles the fade-to-black / fade-from-black transition.
      // Just make the video layer visible at position 0, no fade, no seek.
      prevIndexRef.current = currentIndex
      setShouldFade(false)
      isFadingRef.current = false
      fadeStartedRef.current = false
      setRenderTick(c => c + 1)
      return
    }

    const isSequentialForward = currentIndex === prev + 1
    const fromIdle = switchFromIdleRef.current
    switchFromIdleRef.current = false

    if (!isSequentialForward && !fromIdle) {
      // Non-sequential jump — fade-to-black covers the cut
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

      // Set position to end immediately for non-sequential jump (mobile)
      if (isMobile) {
        const pos = MODULE_POSITIONS[currentIndex]
        if (pos && ref) {
          const endPos = lerpPosition(pos.start, pos.end, 1)
          videoPositionsRef.current[currentIndex] = endPos
          ref.style.objectPosition = endPos
        }
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

      // Set position to start for sequential transition (mobile)
      if (isMobile) {
        const pos = MODULE_POSITIONS[currentIndex]
        if (pos) {
          const startPos = lerpPosition(pos.start, pos.end, 0)
          videoPositionsRef.current[currentIndex] = startPos
          const ref = videoRefs.current[currentIndex]
          if (ref) ref.style.objectPosition = startPos
        }
      }
      prevIndexRef.current = currentIndex
      // Force a synchronous re-render before paint so opacity sees the updated prevIndexRef
      setRenderTick(c => c + 1)
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
      const shouldPlay = !fading && (videoState.isPlaying || videoState.isIdle)
      if (shouldPlay) {
        activeRef.play().catch(() => {})
      } else {
        activeRef.pause()
      }
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
        const gap = dur && dur !== Infinity ? dur - ct : Infinity
        const nearEnd = dur && dur !== Infinity && gap < 0.15 && !ref.seeking
        if (nearEnd) {
          if (videoState.queuedModuleIndex !== null) {
            // Flush at the loop boundary. On Safari (native HLS) this fires with
            // frame-accurate timing. On Chrome/Firefox (hls.js) timeupdate is coarser
            // (~250ms) so we flush at the same nearEnd threshold (0.15s) to avoid
            // missing the window entirely.
            flushQueuedModule()
            return
          }

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
      // If a module is queued (sequential click during playback), suppress idle entry
      // and let the video play through the idle section to its natural end.
      // Flush near the end (same threshold as idle loop flush) so the switch happens
      // at the last frame boundary.
      if (videoState.queuedModuleIndex !== null) {
        const gap = dur && dur !== Infinity ? dur - ct : Infinity
        const nearEnd = dur && dur !== Infinity && gap < 0.15 && !ref.seeking
        if (nearEnd) {
          flushQueuedModule('activeNearEnd')
        }
        return
      }
      dispatch({ type: 'SET_IDLE', payload: true })
    }
  }

  // Handle video ending
  const handleEnded = (idx: number) => {
    if (idx !== currentIndex) return
    const ref = videoRefs.current[idx]

    if (videoState.isIdle && ref) {
      // If a module is queued, switch on this exact last frame
      if (flushQueuedModule('onEnded')) return

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
      // If a module was queued during active playback, flush it now
      if (flushQueuedModule('onEndedActive')) return
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
  if (modules.length === 0) {
    return <div className="relative w-full h-full bg-black" />
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video shift wrapper — translates videos up on mobile when content panel is visible */}
      <div
        className="absolute inset-0"
        style={{
          transform: isMobile
            ? pageState.contentPanelStage === 'expanded' ? 'translateY(-60vh)'
              : pageState.contentPanelStage === 'peek' ? 'translateY(-2rem)'
              : 'translateY(0)'
            : 'translateY(0)',
          transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
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
              objectPosition: isMobile
                ? (videoPositionsRef.current[idx] || lerpPosition(
                    (MODULE_POSITIONS[idx] || MODULE_POSITIONS[0]).start,
                    (MODULE_POSITIONS[idx] || MODULE_POSITIONS[0]).start,
                    0
                  ))
                : isContentPanelExpanded ? 'calc(50% - 90px) 50%' : '50% 50%',
              transition: shouldFade || fadePhase !== 'idle'
                ? 'opacity 0.3s ease-in-out'
                : 'none',
            }}
            onLoadedMetadata={() => handleLoadedMetadata(idx)}
            onTimeUpdate={() => handleTimeUpdate(idx)}
            onEnded={() => handleEnded(idx)}
            onPause={() => handlePause(idx)}
            onLoadStart={() => dispatch({ type: 'SET_LOADING', payload: true })}
            onError={() => {
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

      </div>

      {/* Next Chapter button (shown only during idle playback, not during intro) */}
      {currentIndex >= 0 && currentIndex < modules.length - 1 && (
        <button
          type="button"
          onClick={() => {
            setButtonVisible(false)
            const nextIdx = currentIndex + 1
            playModule(nextIdx)
            const nextModule = modules[nextIdx]
            if (nextModule?.slug?.current) {
              setModulePage(nextIdx, nextModule.slug.current)
            }
            // Scroll mobile module bar to the new tab
            window.dispatchEvent(new CustomEvent('mobile-module-bar-scroll', { detail: { index: nextIdx } }))
          }}
          className="absolute bg-black text-light font-serif font-normal text-xs tracking-wide uppercase border-light border hover:bg-light hover:text-black px-5 py-2 z-30"
          style={{
            left: '50%',
            // On mobile: sit just above the module bar's resting position, then
            // apply the same translateY the bar uses so they move in lockstep.
            bottom: isMobile
              ? 'calc(var(--mobile-module-bar-height, 0px) + 0.5rem)'
              : '1rem',
            transform: (() => {
              if (isMobile) {
                // Mirror MobileModuleBar's translateY so button and bar animate together
                const isMenuOpen = pageState.isTopMenuOpen
                const isModule = pageState.currentPage === 'module'
                let ty = '0px'
                if (!isMenuOpen && isModule) {
                  if (pageState.contentPanelStage === 'expanded') ty = '-70vh'
                  else if (pageState.contentPanelStage === 'peek') ty = '-4rem'
                }
                return `translateX(-50%) translateY(${ty})`
              }
              const sidebarOffset = 90
              const panelOffset = isContentPanelExpanded ? 192 : 0
              return `translateX(calc(-50% - ${sidebarOffset + panelOffset}px))`
            })(),
            opacity: buttonVisible && !(isMobile && pageState.isTopMenuOpen) ? 1 : 0,
            transition: shouldFade
              ? 'none'
              : `transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${buttonDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            pointerEvents: buttonVisible && !(isMobile && pageState.isTopMenuOpen) ? 'auto' : 'none',
          } as CSSProperties}
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
