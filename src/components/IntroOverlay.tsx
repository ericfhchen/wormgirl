'use client'

import { useEffect, useRef, useState } from 'react'
import attachHls from '@/lib/attachHls'
import { client } from '@/lib/sanity'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'

const SIDEBAR_OFFSET_CLASS = 'w-full lg:w-[calc(100vw-200px)]'

// GROQ query to fetch the singleton intro document
const INTRO_QUERY = `*[_type == "intro"][0]{
  idleVideo { asset-> { playbackId } },
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
  const [idleUrl, setIdleUrl] = useState<string | null>(null)
  const [buttonLabel, setButtonLabel] = useState('PRELUDE')
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [exitAfterLoop, setExitAfterLoop] = useState(false)
  const { state: videoState, dispatch } = useVideo()
  const { state: modulesState } = useModules()
  const { setModulePage } = usePageState()

  const loopCompletedRef = useRef(false)

  const buttonShouldShow = isVideoReady && !exitAfterLoop && !modulesState.loading && modulesState.modules.length > 0

  // Contexts for dispatching actions when the button is clicked
  // Fetch intro settings from Sanity once
  useEffect(() => {
    client
      .fetch(INTRO_QUERY)
      .then((data) => {
        const pid = getPlaybackId(data?.idleVideo)
        if (pid) setIdleUrl(`https://stream.mux.com/${pid}.m3u8`)
        if (data?.buttonLabel) setButtonLabel(data.buttonLabel)
      })
      .catch(console.error)
  }, [])

  // Close overlay automatically if user selects any module via sidebar
  useEffect(() => {
    if (videoState.currentModuleIndex >= 0) {
      const isPrelude = videoState.currentModuleIndex === 0

      if (isPrelude) {
        // User selected Prelude – wait for the current loop to finish so the cut feels seamless
        if (!exitAfterLoop) setExitAfterLoop(true)
      } else {
        // Any other module – close immediately so the intro clip doesn’t linger
        if (!isClosing) {
          // Skip fade – unmount overlay right away
          setIsClosing(true)
          onFinish()
        }
      }
    }
  }, [videoState.currentModuleIndex])

  // Attach HLS once we have a URL and ref
  useEffect(() => {
    if (idleUrl && videoRef.current) {
      attachHls(videoRef.current, idleUrl)
    }
  }, [idleUrl])

  // When the video can play, hide the pre-loader
  const handleCanPlay = () => {
    setIsVideoReady(true)
    // Autoplay the loop
    if (videoRef.current) {
      videoRef.current.play().catch(() => {/* ignore */})
    }
  }

  // Ensure continuous looping even when browser fails to honor <video loop>
  const restartLoop = () => {
    if (videoRef.current) {
      try {
        if ('fastSeek' in videoRef.current) {
          (videoRef.current as any).fastSeek(0)
        } else {
          (videoRef.current as HTMLVideoElement).currentTime = 0.001
        }
        videoRef.current.play().catch(() => {/* ignore */})
      } catch {/* ignore */}
    }
  }

  // Track previous time for stall detection (Safari fix)
  const prevTimeRef = useRef(0)

  const handleTimeUpdate = () => {
    const vid = videoRef.current
    if (!vid) return

    const ct = vid.currentTime
    const prev = prevTimeRef.current
    prevTimeRef.current = ct

    const dur = vid.duration
    const nearEnd = dur && dur !== Infinity && dur - ct < 0.15 && ct >= prev

    // If currentTime stopped increasing near end, or we're near end -> restart
    // If we need to exit and we're at loop boundary → begin fade out
    const atBoundary = ct < prev || nearEnd
    if (atBoundary) {
      loopCompletedRef.current = true
    }

    if (exitAfterLoop && atBoundary && !videoState.isLoading && !isClosing) {
      setIsClosing(true)
      setTimeout(onFinish, 500)
      return
    }

    if (nearEnd && !vid.seeking) {
      restartLoop()
    }
  }

  // When loop already completed and video finished loading, close overlay
  useEffect(() => {
    if (exitAfterLoop && loopCompletedRef.current && !videoState.isLoading && !isClosing) {
      setIsClosing(true)
      setTimeout(onFinish, 500)
    }
  }, [exitAfterLoop, videoState.isLoading])

  // Click handler for the intro button
  const handleClick = () => {
    // Immediately queue the Prelude (index 0) and start playback
    dispatch({ type: 'SET_IDLE', payload: false })
    dispatch({ type: 'SET_MODULE', payload: 0 })
    dispatch({ type: 'PLAY' })
    // Update sidebar / page state
    const firstModule = modulesState.modules[0]
    if (firstModule?.slug?.current) {
      setModulePage(0, firstModule.slug.current)
    }

    // Mark to exit after current loop finishes for seamless cut
    setExitAfterLoop(true)
  }

  // Overlay styles – fade out when closing
  const overlayStyle = {
    opacity: isClosing ? 0 : 1,
    transition: 'opacity 0.5s ease-in-out',
    // Disable pointer events once user has chosen to exit so sidebar/content panel can slide over
    pointerEvents: exitAfterLoop ? 'none' : 'auto',
  } as React.CSSProperties

  return (
    <div className={`fixed top-0 left-0 h-full ${SIDEBAR_OFFSET_CLASS} z-[15] flex items-center justify-center`} style={overlayStyle}>
      {/* Video layer */}
      {idleUrl && (
        <video
          ref={videoRef}
          preload="auto"
          muted
          playsInline
          // rely on manual loop handling for wider support
          crossOrigin="anonymous"
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={restartLoop}
          onPause={() => {
            // Safari sometimes pauses at loop boundary
            if (videoRef.current && !videoRef.current.seeking) {
              restartLoop()
            }
          }}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: isVideoReady ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
        />
      )}

      {/* Prelude button */}
      {buttonShouldShow && (
        <button
          type="button"
          onClick={handleClick}
          className="absolute bottom-4 bg-black text-light font-serif uppercase font-extrabold border-light border hover:bg-light hover:text-black transition-all duration-150 ease-in-out px-5 py-2"
        >
          {buttonLabel || 'PRELUDE'}
        </button>
      )}
    </div>
  )
}