
'use client'

import * as React from 'react'
import { createContext, useContext, useReducer, useRef, ReactNode } from 'react'

// Types
interface VideoState {
  currentModuleIndex: number
  isPlaying: boolean
  isIdle: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  queuedModuleIndex: number | null
  // Signal for IntroOverlay: prelude was requested from intro, wait for intro video to finish
  pendingPreludeFromIntro: boolean
}

type VideoAction =
  | { type: 'SET_MODULE'; payload: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_IDLE'; payload: boolean }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'QUEUE_MODULE'; payload: number | null }
  | { type: 'SET_PENDING_PRELUDE'; payload: boolean }

interface VideoContextType {
  state: VideoState
  dispatch: React.Dispatch<VideoAction>
  // Helper methods
  playModule: (index: number) => void
  togglePlayPause: () => void
  enterIdleMode: () => void
  exitIdleMode: () => void
  // Ref shared between IntroOverlay and callers (Sidebar, MobileModuleBar) —
  // set synchronously before playModule(0) to prevent idle-loop seek-back race
  introPreludeRef: React.MutableRefObject<boolean>
}

// Initial state
const initialState: VideoState = {
  // Start at -1 so VideoPlayerStacked shows the intro idle clip first
  currentModuleIndex: -1,
  isPlaying: false,
  // Begin in idle mode so the intro clip loops automatically
  isIdle: true,
  currentTime: 0,
  duration: 0,
  isLoading: true,
  queuedModuleIndex: null,
  pendingPreludeFromIntro: false,
}

// Reducer
function videoReducer(state: VideoState, action: VideoAction): VideoState {
  switch (action.type) {
    case 'SET_MODULE':
      return {
        ...state,
        currentModuleIndex: action.payload,
        isIdle: false,
        currentTime: 0,
        queuedModuleIndex: null,
        pendingPreludeFromIntro: false,
      }
    case 'PLAY':
      return { ...state, isPlaying: true }
    case 'PAUSE':
      return { ...state, isPlaying: false }
    case 'SET_IDLE':
      return { ...state, isIdle: action.payload }
    case 'SET_TIME':
      return { ...state, currentTime: action.payload }
    case 'SET_DURATION':
      return { ...state, duration: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'QUEUE_MODULE':
      return { ...state, queuedModuleIndex: action.payload }
    case 'SET_PENDING_PRELUDE':
      return { ...state, pendingPreludeFromIntro: action.payload }
    default:
      return state
  }
}

// Context
const VideoContext = createContext<VideoContextType | undefined>(undefined)

// Provider
export function VideoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(videoReducer, initialState)
  const introPreludeRef = useRef(false)

  const playModule = (index: number) => {
    // If the selected module is already the current one and we are in idle mode,
    // keep looping the idle video instead of restarting the main video.
    if (index === state.currentModuleIndex && state.isIdle) {
      return
    }

    // Special handling while the current video is looping its idle clip
    if (state.isIdle) {
      // From the intro (-1) — IntroOverlay handles the transition
      if (state.currentModuleIndex === -1) {
        // For prelude (index 0): don't dispatch SET_MODULE yet — IntroOverlay waits for
        // the intro video to finish, then dispatches SET_MODULE + PLAY itself.
        // Dispatching now would make VideoPlayerStacked show/play the prelude immediately.
        if (index === 0) {
          introPreludeRef.current = true
          dispatch({ type: 'SET_PENDING_PRELUDE', payload: true })
          return
        }
        dispatch({ type: 'SET_MODULE', payload: index })
        return
      }

      const current = state.currentModuleIndex

      // Clicking the SAME module: keep looping its idle clip (no changes)
      if (index === current) {
        return
      }

      const isSequential = index === current + 1

      if (isSequential) {
        // Sequential forward — queue for smooth loop-boundary transition
        dispatch({ type: 'QUEUE_MODULE', payload: index })
      } else {
        // Non-sequential — dispatch immediately so video fade-to-black starts in sync with content panel
        dispatch({ type: 'SET_MODULE', payload: index })
        dispatch({ type: 'PLAY' })
      }
      return
    }

    // Sequential forward during active playback — queue and let the current clip finish
    // (mirrors the intro-to-prelude pattern: suppress idle loop-back, play to natural end, then switch)
    const isSequentialForward = index === state.currentModuleIndex + 1
    if (isSequentialForward) {
      dispatch({ type: 'QUEUE_MODULE', payload: index })
      return
    }

    // Non-sequential during active playback — dispatch immediately, cancel any pending queue.
    // The fade system in VideoPlayerStacked handles rapid clicks via useLayoutEffect cleanup.
    dispatch({ type: 'SET_MODULE', payload: index })
    dispatch({ type: 'PLAY' })
  }

  const togglePlayPause = () => {
    dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' })
  }

  const enterIdleMode = () => {
    dispatch({ type: 'SET_IDLE', payload: true })
    dispatch({ type: 'PAUSE' })
  }

  const exitIdleMode = () => {
    dispatch({ type: 'SET_IDLE', payload: false })
  }

  const value: VideoContextType = {
    state,
    dispatch,
    playModule,
    togglePlayPause,
    enterIdleMode,
    exitIdleMode,
    introPreludeRef
  }

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
}

// Hook
export function useVideo() {
  const context = useContext(VideoContext)
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider')
  }
  return context
}