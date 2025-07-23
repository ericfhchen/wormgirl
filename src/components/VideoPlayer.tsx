'use client'

import { useEffect, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'
import { client, SanityModule } from '@/lib/sanity'

export default function VideoPlayer() {
  const { state: videoState, dispatch, enterIdleMode, exitIdleMode } = useVideo()
  const { isModulePage } = usePageState()
  const mainPlayerRef = useRef<any>(null)
  const idlePlayerRef = useRef<any>(null)
  const [modules, setModules] = useState<SanityModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch modules from Sanity
  useEffect(() => {
    async function fetchModules() {
      try {
        setLoading(true)
        // Use the same getModules function as Sidebar for consistency
        const fetchedModules = await client.fetch(`
          *[_type == "module"] | order(order asc) {
            _id,
            title,
            slug,
            order,
            timeline,
            video {
              asset->
            },
            idleVideo {
              asset->
            }
          }
        `)
        
        console.log('Fetched modules:', fetchedModules)
        setModules(fetchedModules)
        setError(null)
      } catch (error) {
        console.error('Error fetching modules:', error)
        setError('Failed to load video data')
      } finally {
        setLoading(false)
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    fetchModules()
  }, [dispatch])

  // Get current module
  const currentModule = videoState.currentModuleIndex >= 0 && videoState.currentModuleIndex < modules.length
    ? modules[videoState.currentModuleIndex]
    : null

  // Get playback IDs for both videos
  const mainVideo = currentModule?.video
  const idleVideo = currentModule?.idleVideo

  const mainPlaybackId = (mainVideo as any)?.asset?.playbackId || 
                         (mainVideo as any)?.playbackId || 
                         (mainVideo as any)?.asset?.data?.playback_ids?.[0]?.id ||
                         (mainVideo as any)?.data?.playback_ids?.[0]?.id

  const idlePlaybackId = (idleVideo as any)?.asset?.playbackId || 
                         (idleVideo as any)?.playbackId || 
                         (idleVideo as any)?.asset?.data?.playback_ids?.[0]?.id ||
                         (idleVideo as any)?.data?.playback_ids?.[0]?.id

  console.log('Video Player State Debug:', {
    currentModuleIndex: videoState.currentModuleIndex,
    moduleTitle: currentModule?.title,
    isIdle: videoState.isIdle,
    isPlaying: videoState.isPlaying,
    hasMainVideo: !!mainPlaybackId,
    hasIdleVideo: !!idlePlaybackId,
    mainPlaybackId,
    idlePlaybackId
  })

  // Get the currently active player
  const activePlayerRef = videoState.isIdle ? idlePlayerRef : mainPlayerRef

  // Handle video events for main player
  const handleMainLoadedMetadata = () => {
    console.log('✅ Main video metadata loaded')
    if (mainPlayerRef.current) {
      const duration = mainPlayerRef.current.duration
      console.log('Main video duration:', duration)
      dispatch({ type: 'SET_DURATION', payload: duration })
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleMainTimeUpdate = () => {
    if (mainPlayerRef.current && !videoState.isIdle) {
      const currentTime = mainPlayerRef.current.currentTime
      const duration = mainPlayerRef.current.duration
      
      dispatch({ type: 'SET_TIME', payload: currentTime })
      
      // Debug time updates occasionally
      if (Math.floor(currentTime) % 5 === 0 && Math.abs(currentTime - Math.floor(currentTime)) < 0.1) {
        console.log('Main video time update:', {
          currentTime: currentTime.toFixed(2),
          duration: duration?.toFixed(2),
          remaining: duration ? (duration - currentTime).toFixed(2) : 'unknown'
        })
      }
      
      // Start idle video 0.5 seconds before main video ends to eliminate black flash
      if (duration && currentTime && (duration - currentTime) < 0.5 && (duration - currentTime) > 0.4) {
        if (idlePlaybackId && idlePlayerRef.current && !videoState.isIdle) {
          console.log('🔄 Pre-starting idle video to eliminate black flash')
          idlePlayerRef.current.currentTime = 0
          idlePlayerRef.current.play().catch(console.error)
        }
      }
      
      // Manual end detection
      if (duration && currentTime && (duration - currentTime) < 0.1) {
        console.log('🔥 MAIN VIDEO END DETECTED! 🔥')
        handleMainVideoEnd()
      }
    }
  }

  const handleMainVideoEnd = () => {
    console.log('Main video ended - transitioning to idle')
    
    // Switch to idle video if available
    if (idlePlaybackId && !videoState.isIdle) {
      console.log('Entering idle mode for module:', currentModule?.title)
      
      // Start idle video immediately and then switch visibility
      if (idlePlayerRef.current) {
        console.log('Starting idle video playback')
        idlePlayerRef.current.currentTime = 0
        idlePlayerRef.current.play().then(() => {
          console.log('✅ Idle video started playing - switching visibility')
          dispatch({ type: 'SET_IDLE', payload: true })
        }).catch((error: any) => {
          console.error('Failed to start idle video:', error)
          // Switch visibility anyway as fallback
          dispatch({ type: 'SET_IDLE', payload: true })
        })
      } else {
        // Fallback if no idle player
        dispatch({ type: 'SET_IDLE', payload: true })
      }
    }
  }

  const handleMainPlay = () => {
    console.log('Main video play event triggered')
    if (!videoState.isIdle) {
      dispatch({ type: 'PLAY' })
    }
  }

  const handleMainPause = () => {
    console.log('Main video pause event triggered')
    if (!videoState.isIdle) {
      dispatch({ type: 'PAUSE' })
    }
  }

  const handleMainEnded = () => {
    console.log('🔥 MAIN VIDEO ENDED EVENT! 🔥')
    handleMainVideoEnd()
  }

  // Handle video events for idle player
  const handleIdleLoadedMetadata = () => {
    console.log('✅ Idle video metadata loaded and ready')
  }

  const handleIdleTimeUpdate = () => {
    if (idlePlayerRef.current && videoState.isIdle) {
      const currentTime = idlePlayerRef.current.currentTime
      dispatch({ type: 'SET_TIME', payload: currentTime })
    }
  }

  const handleIdlePlay = () => {
    console.log('Idle video play event triggered')
    if (videoState.isIdle) {
      dispatch({ type: 'PLAY' })
    }
  }

  const handleIdlePause = () => {
    console.log('Idle video pause event triggered')
    if (videoState.isIdle) {
      dispatch({ type: 'PAUSE' })
    }
  }

  // Common handlers
  const handleLoadStart = () => {
    dispatch({ type: 'SET_LOADING', payload: true })
  }

  const handleError = (error: any, playerType: string) => {
    console.error(`${playerType} video player error:`, error)
    setError('Video playback error')
    dispatch({ type: 'SET_LOADING', payload: false })
  }

  // Sync video state with active player
  useEffect(() => {
    const player = activePlayerRef.current
    if (player) {
      if (videoState.isPlaying) {
        player.play().catch(console.error)
      } else {
        player.pause()
      }
    }
  }, [videoState.isPlaying, videoState.isIdle])

  // Handle module changes - reset main player position
  useEffect(() => {
    if (mainPlayerRef.current && currentModule) {
      console.log('Module changed - resetting both players')
      
      // Reset main player
      mainPlayerRef.current.currentTime = 0
      dispatch({ type: 'SET_TIME', payload: 0 })
      
      // Ensure we're not in idle mode when switching modules
      if (videoState.isIdle) {
        dispatch({ type: 'SET_IDLE', payload: false })
      }
      
      // Reset idle player if it exists
      if (idlePlayerRef.current && idlePlaybackId) {
        console.log('Resetting idle player for new module')
        idlePlayerRef.current.currentTime = 0
        idlePlayerRef.current.pause() // Ensure it's paused and ready
        
        // Small delay to ensure the idle player is properly reset
        setTimeout(() => {
          if (idlePlayerRef.current) {
            idlePlayerRef.current.load() // Force reload the video element
          }
        }, 100)
      }
      
      // Auto-play main video when module changes
      if (videoState.isPlaying) {
        mainPlayerRef.current.play().catch(console.error)
      }
    }
  }, [videoState.currentModuleIndex, currentModule, idlePlaybackId])

  // Handle idle mode transitions
  useEffect(() => {
    if (videoState.isIdle && idlePlayerRef.current) {
      console.log('Ensuring idle video is playing')
      // Always explicitly start the idle video when entering idle mode
      idlePlayerRef.current.currentTime = 0
      idlePlayerRef.current.play().catch((error: any) => {
        console.error('Failed to play idle video in transition:', error)
      })
    } else if (!videoState.isIdle && mainPlayerRef.current) {
      console.log('Transitioning to main video')
      if (videoState.isPlaying) {
        mainPlayerRef.current.play().catch(console.error)
      }
      // Pause the idle video when not in use to save resources
      if (idlePlayerRef.current) {
        idlePlayerRef.current.pause()
      }
    }
  }, [videoState.isIdle])

  const handleVideoClick = () => {
    // Allow user to exit idle mode by clicking on the video
    if (videoState.isIdle) {
      console.log('User clicked during idle mode - exiting idle mode')
      dispatch({ type: 'SET_IDLE', payload: false })
      
      // Reset to beginning of main video
      if (mainPlayerRef.current) {
        mainPlayerRef.current.currentTime = 0
        dispatch({ type: 'SET_TIME', payload: 0 })
      }
    }
  }

  // Show plain black background when no video is available
  if (!currentModule || !mainPlaybackId) {
    return (
      <div className="relative w-full h-full aspect-video bg-black"></div>
    )
  }

  return (
    <div 
      className="relative w-full h-full aspect-video bg-black cursor-pointer"
      onClick={handleVideoClick}
    >
      {/* Main Video Player */}
      <MuxPlayer
        ref={mainPlayerRef}
        playbackId={mainPlaybackId}
        metadata={{
          video_id: currentModule._id,
          video_title: currentModule.title,
          viewer_user_id: 'educational-app-user'
        }}
        streamType="on-demand"
        style={{ 
          width: '100%', 
          height: '100%',
          aspectRatio: '16/9',
          '--controls': 'none',
          opacity: videoState.isIdle ? 0 : 1,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: videoState.isIdle ? 1 : 2
        }}
        onLoadedMetadata={handleMainLoadedMetadata}
        onTimeUpdate={handleMainTimeUpdate}
        onPlay={handleMainPlay}
        onPause={handleMainPause}
        onEnded={handleMainEnded}
        onLoadStart={handleLoadStart}
        onError={(error) => handleError(error, 'Main')}
        preload="auto"
        crossOrigin="anonymous"
        loop={false}
        muted={true}
        autoPlay={true}
        playsInline={true}
        poster=""
        className="w-full h-full"
      />

      {/* Idle Video Player - Only render if idle video exists */}
      {idlePlaybackId && (
        <MuxPlayer
          key={`idle-${idlePlaybackId}`}
          ref={idlePlayerRef}
          playbackId={idlePlaybackId}
          metadata={{
            video_id: `${currentModule._id}-idle`,
            video_title: `${currentModule.title} (Idle)`,
            viewer_user_id: 'educational-app-user'
          }}
          streamType="on-demand"
          style={{ 
            width: '100%', 
            height: '100%',
            aspectRatio: '16/9',
            '--controls': 'none',
            opacity: videoState.isIdle ? 1 : 0,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: videoState.isIdle ? 2 : 1
          }}
          onLoadedMetadata={handleIdleLoadedMetadata}
          onTimeUpdate={handleIdleTimeUpdate}
          onPlay={handleIdlePlay}
          onPause={handleIdlePause}
          onLoadStart={handleLoadStart}
          onError={(error) => handleError(error, 'Idle')}
          preload="auto"
          crossOrigin="anonymous"
          loop={true}
          muted={true}
          autoPlay={false}
          playsInline={true}
          poster=""
          className="w-full h-full"
        />
      )}
    </div>
  )
} 