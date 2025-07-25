
'use client'

import * as React from 'react'
import { createContext, useContext, useReducer, ReactNode } from 'react'

// Types
interface VideoState {
  currentModuleIndex: number
  isPlaying: boolean
  isIdle: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  queuedModuleIndex: number | null
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

interface VideoContextType {
  state: VideoState
  dispatch: React.Dispatch<VideoAction>
  // Helper methods
  playModule: (index: number) => void
  togglePlayPause: () => void
  enterIdleMode: () => void
  exitIdleMode: () => void
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
        // Clear any queued module once we actively switch
        queuedModuleIndex: null,
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
    default:
      return state
  }
}

// Context
const VideoContext = createContext<VideoContextType | undefined>(undefined)

// Provider
export function VideoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(videoReducer, initialState)

  // Debounce timer for rapid, successive module selections
  const moduleChangeTimeout = React.useRef<number | null>(null)
  const DEBOUNCE_MS = 350 // wait this long after the *last* click before switching modules

  const playModule = (index: number) => {
    // Always cancel any in-flight debounce so previous clicks can't override this one
    if (moduleChangeTimeout.current) {
      clearTimeout(moduleChangeTimeout.current)
      moduleChangeTimeout.current = null
    }

    // If the selected module is already the current one and we are in idle mode,
    // keep looping the idle video instead of restarting the main video.
    if (index === state.currentModuleIndex && state.isIdle) {
      return
    }

    // Special handling while the current video is looping its idle clip
    if (state.isIdle) {
      // If we're in the intro (-1) and user selects any module, switch immediately but stay idle/paused
      if (state.currentModuleIndex === -1) {
        dispatch({ type: 'SET_MODULE', payload: index })
        // Keep the newly selected module in idle mode so its idle clip loops
        dispatch({ type: 'SET_IDLE', payload: true })
        dispatch({ type: 'PAUSE' })
        return
      }

      const current = state.currentModuleIndex

      // 1. Clicking the SAME module: keep looping its idle clip (no changes)
      if (index === current) {
        return
      }

      // 2. Clicking the *next* sequential module → queue it; let idle loop finish first
      if (index === current + 1) {
        dispatch({ type: 'QUEUE_MODULE', payload: index })
        return
      }

      // 3. Any other module (out-of-order or previous) → switch immediately
      dispatch({ type: 'SET_MODULE', payload: index })
      // Keep playback paused so VideoPlayerStacked can perform a clean fade to the
      // new module's idle clip without briefly showing the main video.
      dispatch({ type: 'PAUSE' })
      return
    }

    // For rapid consecutive clicks while an active transition may still be in progress,
    // Debounce and only act on the *last* click when not in idle mode.
    moduleChangeTimeout.current = window.setTimeout(() => {
      dispatch({ type: 'SET_MODULE', payload: index })
      dispatch({ type: 'PLAY' })
      moduleChangeTimeout.current = null
    }, DEBOUNCE_MS)
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
    exitIdleMode
  }

  // Cleanup any pending timeouts when the provider unmounts
  React.useEffect(() => {
    return () => {
      if (moduleChangeTimeout.current) {
        clearTimeout(moduleChangeTimeout.current)
      }
    }
  }, [])

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