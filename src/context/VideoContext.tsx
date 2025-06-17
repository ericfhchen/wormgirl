'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'

// Types
interface VideoState {
  currentModuleIndex: number
  isPlaying: boolean
  isIdle: boolean
  currentTime: number
  duration: number
  isLoading: boolean
}

type VideoAction = 
  | { type: 'SET_MODULE'; payload: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SET_IDLE'; payload: boolean }
  | { type: 'SET_TIME'; payload: number }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }

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
  currentModuleIndex: 0,
  isPlaying: false,
  isIdle: false,
  currentTime: 0,
  duration: 0,
  isLoading: true
}

// Reducer
function videoReducer(state: VideoState, action: VideoAction): VideoState {
  switch (action.type) {
    case 'SET_MODULE':
      return {
        ...state,
        currentModuleIndex: action.payload,
        isIdle: false,
        currentTime: 0
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
    default:
      return state
  }
}

// Context
const VideoContext = createContext<VideoContextType | undefined>(undefined)

// Provider
export function VideoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(videoReducer, initialState)

  const playModule = (index: number) => {
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
    exitIdleMode
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