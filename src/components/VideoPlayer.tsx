'use client'

import { useEffect, useRef } from 'react'
import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'

export default function VideoPlayer() {
  const { state: videoState, dispatch, enterIdleMode } = useVideo()
  const { isModulePage } = usePageState()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Placeholder for MUX integration
  // This will be replaced with actual MUX Player component
  
  return (
    <div className="relative w-full aspect-video bg-black">
      {/* Placeholder video player */}
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Video Player</p>
          <p className="text-sm opacity-75">
            {videoState.isIdle ? 'Idle Mode' : `Module ${videoState.currentModuleIndex + 1}`}
          </p>
          <p className="text-xs opacity-50 mt-2">
            MUX Player will be integrated here
          </p>
        </div>
      </div>

      {/* Video controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => dispatch({ type: videoState.isPlaying ? 'PAUSE' : 'PLAY' })}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {videoState.isPlaying ? '⏸️' : '▶️'}
            </button>
            <div className="text-sm">
              {Math.floor(videoState.currentTime / 60)}:
              {Math.floor(videoState.currentTime % 60).toString().padStart(2, '0')} /
              {Math.floor(videoState.duration / 60)}:
              {Math.floor(videoState.duration % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {videoState.isIdle && (
              <span className="px-2 py-1 bg-yellow-500 text-black text-xs rounded">
                Idle
              </span>
            )}
            {!isModulePage && (
              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                Content Page
              </span>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full h-1 bg-white/20 rounded-full mt-3">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{
              width: videoState.duration > 0 
                ? `${(videoState.currentTime / videoState.duration) * 100}%` 
                : '0%'
            }}
          />
        </div>
      </div>
    </div>
  )
} 