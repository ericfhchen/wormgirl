
'use client'

import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import attachHls from '@/lib/attachHls'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'
import useIsMobile from '@/lib/hooks/useIsMobile'

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

const getIdleVideoUrl = (module: any) => {
  const playbackId = getVideoPlaybackId(module?.idleVideo)
  return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
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
  const buttonDuration = pageState.contentPanelStage === 'hidden' ? 300 : 500

  // Local debug toggle – press "d" to show/hide overlay
  const [showDebug, setShowDebug] = useState(false)

  // One ref per module main video               ↓ index in modules array
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  // Separate ref for idle clip of *current* module
  const idleRef = useRef<HTMLVideoElement | null>(null)

  // Track previous time of idle video to detect loop wrap-around
  const idlePrevTimeRef = useRef(0)

  // Cache modules list & indices early so all hooks can use them safely
  const modules = modulesState.modules
  const currentIndex = videoState.currentModuleIndex

  // Track previous index to detect non-sequential jumps
  const prevIndexRef = useRef<number>(-1)
  const [shouldFade, setShouldFade] = useState(false)
  const [fadePhase, setFadePhase] = useState<'idle' | 'out' | 'in'>('idle')

  // Control Next Chapter button visibility with delayed show after idle starts
  const [buttonVisible, setButtonVisible] = useState(false)

  // Hide button on module change, then (re-)schedule delayed show if we’re in idle mode
  useEffect(() => {
    let t: number | undefined
    // Always hide first
    setButtonVisible(false)

    // If the player is currently in idle mode, schedule the button to re-appear
    if (videoState.isIdle) {
      t = window.setTimeout(() => setButtonVisible(true), 1000)
    }

    return () => {
      if (t) clearTimeout(t)
    }
  }, [currentIndex, videoState.isIdle])

  // Still respond to idle mode toggles when module index remains unchanged
  useEffect(() => {
    let t: number | undefined
    if (videoState.isIdle) {
      t = window.setTimeout(() => setButtonVisible(true), 1000)
    } else {
      setButtonVisible(false)
    }
    return () => {
      if (t) clearTimeout(t)
    }
  }, [videoState.isIdle])

  // Compute idle clip URL for current module (may be null)
  const idleUrl: string | null =
    currentIndex >= 0 && currentIndex < modules.length
      ? getIdleVideoUrl(modules[currentIndex])
      : null

  // Helper to build debug overlay data
  const buildDebugInfo = () => {
    const calcOpacity = (idx: number) => {
      if (fadePhase === 'out' && idx === prevIndexRef.current) return 1
      if (fadePhase !== 'idle') return 0
      if (videoState.isIdle) return 0
      return idx === currentIndex ? 1 : 0
    }

    return {
      currentIndex,
      prevIndex: prevIndexRef.current,
      fadePhase,
      shouldFade,
      isPlaying: videoState.isPlaying,
      isIdle: videoState.isIdle,
      videos: modules.map((m, idx) => {
        const ref = videoRefs.current[idx]
        return {
          idx,
          title: m?.title,
          opacity: calcOpacity(idx),
          readyState: ref?.readyState,
          paused: ref?.paused,
          currentTime: ref?.currentTime?.toFixed?.(2),
        }
      }),
      idle: {
        hasIdle: !!idleRef.current,
        readyState: idleRef.current?.readyState,
        paused: idleRef.current?.paused,
        currentTime: idleRef.current?.currentTime?.toFixed?.(2),
      },
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
        return
      }

      // First load BUT jumping directly to a later module → treat as non-sequential
      setShouldFade(true)
      setFadePhase('out')

      const hasIdle = !!idleUrl
      // Ensure idle flag is off until fade-in starts
      dispatch({ type: 'SET_IDLE', payload: false })

      // Seek new module to start
      const firstRef = videoRefs.current[currentIndex]
      if (firstRef) {
        try { firstRef.currentTime = 0 } catch {}
      }

      const outDuration = 300
      const inDelay    = outDuration + 20
      const inDuration = 300

      const t1 = setTimeout(() => {
        if (hasIdle) dispatch({ type: 'SET_IDLE', payload: true })
        setFadePhase('in')
      }, inDelay)

      const t2 = setTimeout(() => {
        setFadePhase('idle')
      }, inDelay + inDuration)

      const t3 = setTimeout(() => {
        setShouldFade(false)
        prevIndexRef.current = currentIndex
      }, inDelay + inDuration + outDuration)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    }

    const isSequentialForward = currentIndex === prev + 1

    if (!isSequentialForward) {
      // Non-sequential jump
      setShouldFade(true)
      setFadePhase('out')

      // Enter idle mode if idle clip exists
      const hasIdle = !!idleUrl
      // Initially keep idle flag false until we start fade-in phase
      dispatch({ type: 'SET_IDLE', payload: false })

      // Seek main video to 0
      const ref = videoRefs.current[currentIndex]
      if (ref) {
        try { ref.currentTime = 0 } catch {}
      }

      // ---- Transition timeline ----
      const outDuration = 300            // ❶ fade-out of previous video
      const inDelay    = outDuration + 20 // small bridge before fade-in
      const inDuration = 300            // ❷ fade-in of new idle/main video

      // 1️⃣ Begin fade-in sequence (overlay to black, new video still hidden)
      const t1 = setTimeout(() => {
        if (hasIdle) dispatch({ type: 'SET_IDLE', payload: true })
        setFadePhase('in')
      }, inDelay)

      // 2️⃣ After new video is visible, fade overlay back out to reveal it
      const t2 = setTimeout(() => {
        setFadePhase('idle') // sets overlay opacity to 0 but keeps it mounted for transition
      }, inDelay + inDuration)

      // 3️⃣ Finally, unmount the overlay once its fade-out completes
      const t3 = setTimeout(() => {
        setShouldFade(false)
        prevIndexRef.current = currentIndex
      }, inDelay + inDuration + outDuration)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
      }
    } else {
      // Sequential navigation
      setShouldFade(false)
      if (videoState.isIdle) dispatch({ type: 'SET_IDLE', payload: false })
      prevIndexRef.current = currentIndex
    }
  }, [currentIndex, idleUrl])

  // Ensure refs array always matches module count
  useEffect(() => {
    if (modules.length === 0) return
    videoRefs.current = Array.from({ length: modules.length }, (_, i) => videoRefs.current[i] ?? null)
  }, [modules.length])

  // Attach HLS streams (or native) whenever video elements or sources change
  useEffect(() => {
    // Attach main videos
    modules.forEach((m, idx) => {
      const url = getVideoUrl(m)
      const vid = videoRefs.current[idx]
      if (url && vid) {
        attachHls(vid, url)
      }
    })

    // Attach idle video (only for current module)
    if (idleUrl && idleRef.current) {
      attachHls(idleRef.current, idleUrl)
    }
  }, [modules, idleUrl])

  // Play / pause management when current module or playback state changes
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= modules.length) return

    // Play/pause handling for active video
    const activeRef = videoRefs.current[currentIndex]
    if (activeRef) {
      if (!videoState.isIdle && !shouldFade && videoState.isPlaying) {
        activeRef.play().catch(console.error)
      } else {
        // Ensure it's paused during fades or idle
        activeRef.pause()
      }
    }

    // Pause and rewind all non-active refs
    videoRefs.current.forEach((ref: HTMLVideoElement | null, idx: number) => {
      if (!ref || idx === currentIndex) return
      ref.pause()
      try { ref.currentTime = 0 } catch {}
    })

    // Prime the *next* sequential video so its first frame is decoded
    if (!shouldFade && videoState.isPlaying) {
      const nextIdx = currentIndex + 1
      const nextRef = videoRefs.current[nextIdx]
      if (nextRef && nextRef.readyState < 2) {
        // Kick off a silent play→pause cycle to force frame decode
        nextRef.muted = true
        nextRef.play()
          .then(() => {
            nextRef.pause()
            try { nextRef.currentTime = 0 } catch {}
          })
          .catch(() => {})
      }
    }

    // Idle video handling
    if (videoState.isIdle && idleRef.current) {
      idleRef.current.play().catch(console.error)
    } else if (idleRef.current) {
      idleRef.current.pause()
    }
  }, [currentIndex, videoState.isPlaying, videoState.isIdle, shouldFade, idleUrl])

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
      dispatch({ type: 'SET_DURATION', payload: ref.duration })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleTimeUpdate = (idx: number) => {
    if (idx !== currentIndex || videoState.isIdle) return
    const ref = videoRefs.current[idx]
    if (ref) {
      dispatch({ type: 'SET_TIME', payload: ref.currentTime })

      // If main video is about to finish, prepare idle clip
      if (ref.duration - ref.currentTime < 0.6) {
        const idleUrl = getIdleVideoUrl(modules[idx])
        if (idleUrl && idleRef.current && !videoState.isIdle) {
          idleRef.current.currentTime = 0
          idleRef.current.play().catch(() => {/* ignore */})
        }
      }

      // Detect end
      if (ref.duration && ref.currentTime && ref.duration - ref.currentTime < 0.1) {
        if (getIdleVideoUrl(modules[idx])) {
          dispatch({ type: 'SET_IDLE', payload: true })
        }
      }
    }
  }

  // Disable click-to-exit-idle – interactions are handled via sidebar only
  const handleClick = () => {}

  // No modules yet – show placeholder
  if (modules.length === 0 || currentIndex === -1) {
    return <div className="relative w-full h-full bg-black" />
  }

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
              opacity:
                fadePhase === 'out'
                  ? idx === prevIndexRef.current
                    ? 1 // start at 1 then fade to 0
                    : 0
                  : fadePhase !== 'idle'
                  ? 0
                  : videoState.isIdle
                  ? 0
                  : idx === currentIndex
                  ? 1
                  : 0,
              zIndex: idx + 1,
              transition: shouldFade || fadePhase !== 'idle' ? 'opacity 0.3s ease-in-out' : 'none',
            }}
            onLoadedMetadata={() => handleLoadedMetadata(idx)}
            onTimeUpdate={() => handleTimeUpdate(idx)}
            onLoadStart={() => dispatch({ type: 'SET_LOADING', payload: true })}
            onError={(e: any) => {
              console.error('Video error', e)
              dispatch({ type: 'SET_LOADING', payload: false })
            }}
          />
        )
      })}

      {idleUrl && (
        <video
          ref={(el: HTMLVideoElement | null) => {
            idleRef.current = el
            if (el && idleUrl) attachHls(el, idleUrl)
          }}
          preload="auto"
          muted
          playsInline
          crossOrigin="anonymous"
          className="absolute top-0 left-0 w-full h-full object-cover"
          style={{
            opacity:
              fadePhase === 'out'
                ? 0
                : fadePhase === 'in'
                ? 1
                : videoState.isIdle
                ? 1
                : 0,
            zIndex: modules.length + 1,
            transition: shouldFade || fadePhase !== 'idle' ? 'opacity 0.3s ease-in-out' : 'none',
          }}
          onLoadedMetadata={() => dispatch({ type: 'SET_LOADING', payload: false })}
          onTimeUpdate={() => {
            if (videoState.isIdle && idleRef.current) {
              const ct = idleRef.current.currentTime
              dispatch({ type: 'SET_TIME', payload: ct })

              // Retrieve any queued module index from global state
              const queuedIdx = (videoState as any).queuedModuleIndex ?? null

              if (queuedIdx !== null) {
                const prev = idlePrevTimeRef.current
                // Detect loop boundary when currentTime wraps from near duration back to 0
                const didLoop = ct < prev

                // Safari sometimes hangs on the last frame and never executes the natural
                // loop, leaving `didLoop` false forever. Detect when the playhead is very
                // close to the end so we can still advance to the queued module.
                const dur = idleRef.current.duration
                const nearEnd =
                  dur && dur !== Infinity && dur - ct < 0.15 && ct >= prev

                if (didLoop || nearEnd) {
                  // Commit the queued module immediately after the current loop finishes
                  dispatch({ type: 'SET_MODULE', payload: queuedIdx })
                  dispatch({ type: 'PLAY' })
                  dispatch({ type: 'QUEUE_MODULE', payload: null })

                  // Pause idle video to prevent extra loops while React state updates
                  try { idleRef.current.pause() } catch {}
                }

                // Update reference for next check
                idlePrevTimeRef.current = ct
              }
              else {
                // No queued module – just keep tracking time
                idlePrevTimeRef.current = ct

                // --- Safari stall hotfix ---
                // On some Safari builds the HLS element gets stuck on the last frame:
                // `paused` remains false, `ended` never fires, and currentTime stops at
                // (or just before) duration. Detect that condition and manually rewind
                // to maintain a seamless loop.
                const dur = idleRef.current.duration
                if (
                  dur &&
                  dur !== Infinity &&
                  // Pre-emptively jump ~0.15 s before the actual end to hide latency.
                  dur - ct < 0.15 &&
                  ct >= idlePrevTimeRef.current &&
                  !idleRef.current.seeking
                ) {
                  try {
                    const vid = idleRef.current
                    if (!vid) return

                    // Use fastSeek for a seamless jump when supported (Safari 15+).
                    if ((vid as any).fastSeek) {
                      (vid as any).fastSeek(0)
                    } else {
                      vid.currentTime = 0.001 // tiny offset avoids potential keyframe wait
                    }

                    vid.play().catch(() => {
                      /* ignore */
                    })
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
          }}
          // Manually restart the idle clip when it reaches the end. Safari’s native HLS
          // implementation sometimes stops after the first loop even when `loop` is not
          // used. Restarting playback here guarantees continuous looping across browsers.
          onEnded={() => {
            if (videoState.isIdle && idleRef.current) {
              try {
                idleRef.current.currentTime = 0
                idleRef.current.play().catch(() => {/* ignore */})
              } catch {
                /* ignore */
              }
            }
          }}
          // Safari sometimes silently pauses the HLS <video> at loop boundaries without
          // firing an `ended` event. Detect this and force playback to resume so the idle
          // clip continues looping.
          onPause={() => {
            // Only auto-resume if we *expect* to be looping (idle mode & not fading)
            if (videoState.isIdle && !shouldFade && idleRef.current) {
              // Give the browser a tick to update internal state, then resume.
              window.requestAnimationFrame(() => {
                if (idleRef.current && idleRef.current.paused) {
                  try {
                    idleRef.current.play().catch(() => {/* ignore */})
                  } catch {
                    /* ignore */
                  }
                }
              })
            }
          }}
          onError={(e: any) => {
            console.error('Idle video error', e)
            dispatch({ type: 'SET_LOADING', payload: false })
          }}
        />
      )}

      {/* Black overlay during fades ensures no flicker */}
      {shouldFade && (
        <div
          className="absolute top-0 left-0 w-full h-full bg-black"
          style={{
            // Keep overlay fully opaque during both transition phases so
            // no underlying frames can peek through.
            opacity: fadePhase === 'idle' ? 0 : 1,
            zIndex: modules.length + 2,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Next Chapter button (shown only during idle playback) */}
      {currentIndex < modules.length - 1 && buttonVisible && (
        <button
          type="button"
          onClick={() => {
            // Hide button immediately
            setButtonVisible(false)
            // Trigger next module playback
            playModule(currentIndex + 1)
            // Update sidebar & content panel
            const nextModule = modules[currentIndex + 1]
            if (nextModule?.slug?.current) {
              setModulePage(currentIndex + 1, nextModule.slug.current)
            }
          }}
          className="absolute bottom-4 bg-black text-light font-serif uppercase font-extrabold border-light border hover:bg-light hover:text-black transition-transform ease-in-out px-5 py-2 z-[9998]"
          style={{
            left: '50%',
            transform: (() => {
              const x = !isMobile && isContentPanelExpanded
                ? 'translateX(calc(-50% - 192px))'
                : 'translateX(-50%)'

              if (!isMobile) return x

              // Match mobile bar offsets so button moves in sync
              const y = pageState.contentPanelStage === 'expanded'
                ? 'translateY(-83vh)'
                : pageState.contentPanelStage === 'peek'
                  ? 'translateY(-12.5rem)'
                  : 'translateY(0)'

              return `${x} ${y}`
            })(),
            opacity: buttonVisible ? 1 : 0,
            transition: shouldFade
              ? 'none'
              : `transform ${buttonDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${buttonDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            pointerEvents: buttonVisible ? 'auto' : 'none'
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