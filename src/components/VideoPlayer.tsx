'use client'

import { useEffect, useRef, useState } from 'react'
import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'
import { useModules } from '@/context/ModulesContext'

export default function VideoPlayer() {
  const { state: videoState, dispatch, enterIdleMode, exitIdleMode } = useVideo()
  const { isModulePage } = usePageState()
  const { state: modulesState, getModule, getNextModule } = useModules()
  
  // Dual main video players for gapless switching
  const mainPlayerARef = useRef<HTMLVideoElement>(null)
  const mainPlayerBRef = useRef<HTMLVideoElement>(null)
  const idlePlayerRef = useRef<HTMLVideoElement>(null)
  
  const [error, setError] = useState<string | null>(null)
  
  // Track which main player is currently active (A or B)
  const [activeMainPlayer, setActiveMainPlayer] = useState<'A' | 'B'>('A')
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  
  // Add states for tracking sequential transitions and fade effects
  const [previousModuleIndex, setPreviousModuleIndex] = useState<number>(-1)
  const [isFading, setIsFading] = useState(false)
  const [fadeProgress, setFadeProgress] = useState<'idle' | 'out' | 'switching' | 'in'>('idle')
  const [fadeFromPlayer, setFadeFromPlayer] = useState<'A' | 'B' | null>(null)

  // Sync loading state with modules context
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: modulesState.loading })
  }, [modulesState.loading, dispatch])

  // Get current and next modules from centralized context
  const currentModule = getModule(videoState.currentModuleIndex)
  const nextModule = getNextModule(videoState.currentModuleIndex)

  // Helper function to get video URL from module
  const getVideoUrl = (module: any) => {
    if (!module?.video) return null
    const video = module.video
    const playbackId = (video as any)?.asset?.playbackId || 
                      (video as any)?.playbackId || 
                      (video as any)?.asset?.data?.playback_ids?.[0]?.id ||
                      (video as any)?.data?.playback_ids?.[0]?.id
    return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
  }

  // Helper function to get idle video URL from module
  const getIdleVideoUrl = (module: any) => {
    if (!module?.idleVideo) return null
    const idleVideo = module.idleVideo
    const playbackId = (idleVideo as any)?.asset?.playbackId || 
                      (idleVideo as any)?.playbackId || 
                      (idleVideo as any)?.asset?.data?.playback_ids?.[0]?.id ||
                      (idleVideo as any)?.data?.playback_ids?.[0]?.id
    return playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
  }

  const currentVideoUrl = getVideoUrl(currentModule)
  const nextVideoUrl = getVideoUrl(nextModule)
  const currentIdleVideoUrl = getIdleVideoUrl(currentModule)

  // Get the currently active main player ref
  const activeMainPlayerRef = activeMainPlayer === 'A' ? mainPlayerARef : mainPlayerBRef
  const inactiveMainPlayerRef = activeMainPlayer === 'A' ? mainPlayerBRef : mainPlayerARef

  // Get the currently active player (main or idle)
  const activePlayerRef = videoState.isIdle ? idlePlayerRef : activeMainPlayerRef

  console.log('Video Player State Debug:', {
    currentModuleIndex: videoState.currentModuleIndex,
    moduleTitle: currentModule?.title,
    activeMainPlayer,
    isIdle: videoState.isIdle,
    isPlaying: videoState.isPlaying,
    hasCurrentVideo: !!currentVideoUrl,
    hasNextVideo: !!nextVideoUrl,
    hasIdleVideo: !!currentIdleVideoUrl,
    modulesLoading: modulesState.loading,
    totalModules: modulesState.modules.length,
    isFirstLoad,
    isFading,
    fadeProgress
  })

  // Handle video events for active main player
  const handleMainLoadedMetadata = (playerType: 'A' | 'B') => {
    const playerRef = playerType === 'A' ? mainPlayerARef : mainPlayerBRef
    console.log(`✅ Main video ${playerType} metadata loaded`)
    
    if (playerRef.current && playerType === activeMainPlayer && !isFading) {
      const duration = playerRef.current.duration
      console.log(`Main video ${playerType} duration:`, duration)
      dispatch({ type: 'SET_DURATION', payload: duration })
      dispatch({ type: 'SET_LOADING', payload: false })
      
      // Auto-start playback if this is the first load and we're supposed to be playing
      if (isFirstLoad && videoState.isPlaying) {
        console.log('🚀 Auto-starting first video')
        playerRef.current.play().catch(console.error)
        setIsFirstLoad(false)
      }
    }
  }

  const handleMainTimeUpdate = (playerType: 'A' | 'B') => {
    const playerRef = playerType === 'A' ? mainPlayerARef : mainPlayerBRef
    
    if (playerRef.current && !videoState.isIdle && playerType === activeMainPlayer && !isFading) {
      const currentTime = playerRef.current.currentTime
      const duration = playerRef.current.duration
      
      dispatch({ type: 'SET_TIME', payload: currentTime })
      
      // Start idle video slightly before main video ends
      if (duration && currentTime && (duration - currentTime) < 0.5 && (duration - currentTime) > 0.4) {
        if (currentIdleVideoUrl && idlePlayerRef.current && !videoState.isIdle) {
          console.log('🔄 Pre-starting idle video')
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
    if (currentIdleVideoUrl && !videoState.isIdle) {
      console.log('Entering idle mode for module:', currentModule?.title)
      
      if (idlePlayerRef.current) {
        console.log('Starting idle video playback')
        idlePlayerRef.current.currentTime = 0
        idlePlayerRef.current.play().then(() => {
          console.log('✅ Idle video started - switching to idle mode')
          dispatch({ type: 'SET_IDLE', payload: true })
        }).catch((error: any) => {
          console.error('Failed to start idle video:', error)
          dispatch({ type: 'SET_IDLE', payload: true })
        })
      } else {
        dispatch({ type: 'SET_IDLE', payload: true })
      }
    }
  }

  const handleMainPlay = (playerType: 'A' | 'B') => {
    if (!videoState.isIdle && playerType === activeMainPlayer && !isFading) {
      console.log(`Main video ${playerType} play event`)
      dispatch({ type: 'PLAY' })
    }
  }

  const handleMainPause = (playerType: 'A' | 'B') => {
    if (!videoState.isIdle && playerType === activeMainPlayer && !isFading) {
      console.log(`Main video ${playerType} pause event`)
      dispatch({ type: 'PAUSE' })
    }
  }

  const handleMainEnded = (playerType: 'A' | 'B') => {
    if (playerType === activeMainPlayer && !isFading) {
      console.log(`🔥 MAIN VIDEO ${playerType} ENDED! 🔥`)
      handleMainVideoEnd()
    }
  }

  // Handle idle video events
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
    if (videoState.isIdle) {
      console.log('Idle video play event')
      dispatch({ type: 'PLAY' })
    }
  }

  const handleIdlePause = () => {
    if (videoState.isIdle) {
      console.log('Idle video pause event')
      dispatch({ type: 'PAUSE' })
    }
  }

  const handleLoadStart = () => {
    if (!isFading) {
      dispatch({ type: 'SET_LOADING', payload: true })
    }
  }

  const handleError = (error: Event, playerType: string) => {
    console.error(`${playerType} video player error:`, error)
    setError('Video playback error')
    dispatch({ type: 'SET_LOADING', payload: false })
  }

  // Helper function to check if transition is sequential
  const isSequentialTransition = (currentIndex: number, previousIndex: number) => {
    // Allow transitions from -1 (initial state) to 0 (first module) as sequential
    if (previousIndex === -1 && currentIndex === 0) return true
    // Sequential means going to the next module in order
    return currentIndex === previousIndex + 1
  }

  // Handle module changes - distinguish between sequential and non-sequential transitions
  useEffect(() => {
    if (currentModule && currentVideoUrl) {
      const currentIndex = videoState.currentModuleIndex
      const isSequential = isSequentialTransition(currentIndex, previousModuleIndex)
      
      console.log('Module changed', {
        currentIndex,
        previousIndex: previousModuleIndex,
        isSequential,
        moduleTitle: currentModule.title
      })
      
      // Exit idle mode when switching modules
      if (videoState.isIdle) {
        dispatch({ type: 'SET_IDLE', payload: false })
      }

      // For the first module load, just ensure the current active player is ready
      if (currentIndex === 0 && previousModuleIndex === -1) {
        console.log('Initial module load - setting up first video')
        const currentPlayerRef = activeMainPlayerRef.current
        if (currentPlayerRef) {
          currentPlayerRef.currentTime = 0
          dispatch({ type: 'SET_TIME', payload: 0 })
        }
        setPreviousModuleIndex(currentIndex)
        return
      }

      if (isSequential) {
        // Use existing gapless transition for sequential navigation
        console.log('🎬 Sequential transition - using gapless switch')
        performGaplessTransition()
      } else {
        // Use fade transition for non-sequential navigation
        console.log('🌊 Non-sequential transition - using fade effect')
        performFadeTransition()
      }
      
      // Update previous module index
      setPreviousModuleIndex(currentIndex)
    }
  }, [videoState.currentModuleIndex, currentModule])

  const performGaplessTransition = () => {
    // Existing gapless transition logic
    const newActivePlayer = activeMainPlayer === 'A' ? 'B' : 'A'
    const newPlayerRef = newActivePlayer === 'A' ? mainPlayerARef : mainPlayerBRef
    
    if (newPlayerRef.current) {
      console.log(`🎬 Preparing instant transform-based switch to player ${newActivePlayer}`)
      
      // Reset the new player
      newPlayerRef.current.currentTime = 0
      
      // Function to perform instant switch using transforms
      const performInstantSwitch = () => {
        console.log(`⚡ Transform-based switch to player ${newActivePlayer}`)
        
        // Pause the old player
        const oldPlayerRef = activeMainPlayerRef.current
        if (oldPlayerRef) {
          oldPlayerRef.pause()
        }
        
        // Switch active player immediately - this changes the transform positioning
        setActiveMainPlayer(newActivePlayer)
        dispatch({ type: 'SET_TIME', payload: 0 })
        
        // Start playing the new video immediately if needed
        if (videoState.isPlaying && newPlayerRef.current) {
          // Use a very small delay to ensure DOM has updated
          requestAnimationFrame(() => {
            newPlayerRef.current?.play().then(() => {
              console.log(`✅ Player ${newActivePlayer} now playing with transform switching`)
            }).catch(console.error)
          })
        }
      }
      
      // Switch immediately if video is ready, otherwise wait briefly
      if (newPlayerRef.current.readyState >= 2) {
        performInstantSwitch()
      } else {
        // Very short wait for the video to be ready
        const timeout = setTimeout(performInstantSwitch, 50)
        
        const handleCanPlay = () => {
          clearTimeout(timeout)
          newPlayerRef.current?.removeEventListener('canplay', handleCanPlay)
          performInstantSwitch()
        }
        
        newPlayerRef.current.addEventListener('canplay', handleCanPlay, { once: true })
      }
    }
  }

  const performFadeTransition = () => {
    console.log('🌊 Starting fade transition')
    setIsFading(true)
    setFadeFromPlayer(activeMainPlayer) // Track which player was active before the fade
    
    // Small delay to ensure both players are positioned on-screen, then start fade out
    setTimeout(() => {
      console.log('🌊 Starting fade out phase')
      setFadeProgress('out')
      
      // Phase 1: Fade out current video (300ms)
      setTimeout(() => {
        console.log('🔄 Fade transition - switching players')
        setFadeProgress('switching')
        
        // Pause current player
        const currentPlayerRef = activeMainPlayerRef.current
        if (currentPlayerRef) {
          currentPlayerRef.pause()
        }
        
        // Switch to the other player for the new video
        const newActivePlayer = activeMainPlayer === 'A' ? 'B' : 'A'
        const newPlayerRef = newActivePlayer === 'A' ? mainPlayerARef : mainPlayerBRef
        
        if (newPlayerRef.current) {
          // Reset and prepare new player
          newPlayerRef.current.currentTime = 0
          setActiveMainPlayer(newActivePlayer)
          dispatch({ type: 'SET_TIME', payload: 0 })
          
          // Small delay to ensure player switch is registered
          setTimeout(() => {
            console.log('🔄 Fade transition - fading in new video')
            setFadeProgress('in')
            
            // Start playing if needed
            if (videoState.isPlaying && newPlayerRef.current) {
              newPlayerRef.current.play().then(() => {
                console.log(`✅ Player ${newActivePlayer} now playing after fade transition`)
              }).catch(console.error)
            }
            
            // Phase 3: Fade in complete, end transition (300ms)
            setTimeout(() => {
              console.log('✅ Fade transition complete')
              setIsFading(false)
              setFadeProgress('idle')
              setFadeFromPlayer(null) // Reset fadeFromPlayer after fade
            }, 300)
          }, 50)
        }
      }, 300)
    }, 50) // Initial delay to position both players
  }

  // Handle playback state changes
  useEffect(() => {
    if (!videoState.isIdle && activeMainPlayerRef.current && !isFading) {
      if (videoState.isPlaying) {
        console.log('▶️ Starting playback on active player')
        activeMainPlayerRef.current.play().catch(console.error)
      } else {
        console.log('⏸️ Pausing active player')
        activeMainPlayerRef.current.pause()
      }
    }
  }, [videoState.isPlaying, activeMainPlayer, videoState.isIdle, isFading])

  // Handle idle mode transitions
  useEffect(() => {
    if (videoState.isIdle && idlePlayerRef.current) {
      console.log('Ensuring idle video is playing')
      idlePlayerRef.current.currentTime = 0
      idlePlayerRef.current.play().catch((error: any) => {
        console.error('Failed to play idle video in transition:', error)
      })
    } else if (!videoState.isIdle && activeMainPlayerRef.current && !isFading) {
      console.log('Transitioning to main video')
      if (videoState.isPlaying) {
        activeMainPlayerRef.current.play().catch(console.error)
      }
      if (idlePlayerRef.current) {
        idlePlayerRef.current.pause()
      }
    }
  }, [videoState.isIdle, isFading])

  const handleVideoClick = () => {
    if (videoState.isIdle) {
      console.log('User clicked during idle mode - exiting idle mode')
      dispatch({ type: 'SET_IDLE', payload: false })
      
      if (activeMainPlayerRef.current) {
        activeMainPlayerRef.current.currentTime = 0
        dispatch({ type: 'SET_TIME', payload: 0 })
      }
    }
  }

  // Calculate opacity for fade effect
  const getVideoOpacity = (playerType: 'A' | 'B') => {
    if (!isFading) return 1
    
    if (fadeProgress === 'out') {
      // During fade out, only the fadeFromPlayer is on-screen and should fade out
      // The target player is off-screen so its opacity doesn't matter
      if (playerType === fadeFromPlayer) {
        return 0 // Fade out the original player (1→0 transition)
      } else {
        return 0 // Target player off-screen anyway, but set to 0 for consistency
      }
    } else if (fadeProgress === 'switching') {
      // During switching, both players are on-screen but invisible
      return 0
    } else if (fadeProgress === 'in') {
      // During fade in, fade in the new active player
      if (playerType === activeMainPlayer) {
        return 1 // Fade in the new active player (0→1 transition)
      } else {
        return 0 // Keep the old player invisible
      }
    }
    
    return 1
  }

  // Calculate transform positioning - carefully manage which players are on-screen during fade
  const getVideoTransform = (playerType: 'A' | 'B') => {
    if (isFading) {
      if (fadeProgress === 'out') {
        // During fade out, only the fadeFromPlayer should be on-screen
        // The target player should remain off-screen until switching phase
        if (playerType === fadeFromPlayer) {
          return 'translateX(0)' // Keep fading-out player on-screen
        } else {
          return 'translateX(-100%)' // Keep target player off-screen for now
        }
      } else if (fadeProgress === 'switching' || fadeProgress === 'in') {
        // During switching and fade-in, both players should be on-screen
        // (so the new player can fade in)
        return 'translateX(0)'
      }
    }
    
    // Normal transform logic when not fading
    if (videoState.isIdle) {
      return 'translateX(-100%)'
    }
    
    return playerType === activeMainPlayer ? 'translateX(0)' : 'translateX(-100%)'
  }

  // Show black background when no video is available
  if (!currentModule || !currentVideoUrl) {
    return (
      <div className="relative w-full h-full bg-black"></div>
    )
  }

  return (
    <div 
      className="relative w-full h-full bg-black cursor-pointer overflow-hidden"
      onClick={handleVideoClick}
    >
      {/* Main Video Player A */}
      <video
        ref={mainPlayerARef}
        src={activeMainPlayer === 'A' ? currentVideoUrl : (nextVideoUrl || '')}
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          transform: getVideoTransform('A'),
          transition: isFading ? 'opacity 0.3s ease-in-out' : 'none',
          opacity: getVideoOpacity('A'),
          zIndex: 2
        }}
        onLoadedMetadata={() => handleMainLoadedMetadata('A')}
        onTimeUpdate={() => handleMainTimeUpdate('A')}
        onPlay={() => handleMainPlay('A')}
        onPause={() => handleMainPause('A')}
        onEnded={() => handleMainEnded('A')}
        onLoadStart={handleLoadStart}
        onError={(error: Event) => handleError(error, 'Main A')}
        preload="auto"
        muted={true}
        playsInline={true}
        className="w-full h-full"
        crossOrigin="anonymous"
      />

      {/* Main Video Player B */}
      <video
        ref={mainPlayerBRef}
        src={activeMainPlayer === 'B' ? currentVideoUrl : (nextVideoUrl || '')}
        style={{ 
          width: '100%', 
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          transform: getVideoTransform('B'),
          transition: isFading ? 'opacity 0.3s ease-in-out' : 'none',
          opacity: getVideoOpacity('B'),
          zIndex: 2
        }}
        onLoadedMetadata={() => handleMainLoadedMetadata('B')}
        onTimeUpdate={() => handleMainTimeUpdate('B')}
        onPlay={() => handleMainPlay('B')}
        onPause={() => handleMainPause('B')}
        onEnded={() => handleMainEnded('B')}
        onLoadStart={handleLoadStart}
        onError={(error: Event) => handleError(error, 'Main B')}
        preload="auto"
        muted={true}
        playsInline={true}
        className="w-full h-full"
        crossOrigin="anonymous"
      />

      {/* Idle Video Player */}
      {currentIdleVideoUrl && (
        <video
          ref={idlePlayerRef}
          src={currentIdleVideoUrl}
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            transform: videoState.isIdle ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'none',
            zIndex: 3
          }}
          onLoadedMetadata={handleIdleLoadedMetadata}
          onTimeUpdate={handleIdleTimeUpdate}
          onPlay={handleIdlePlay}
          onPause={handleIdlePause}
          onLoadStart={handleLoadStart}
          onError={(error: Event) => handleError(error, 'Idle')}
          preload="auto"
          muted={true}
          autoPlay={false}
          playsInline={true}
          className="w-full h-full"
          crossOrigin="anonymous"
          loop={true}
        />
      )}
    </div>
  )
}