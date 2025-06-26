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
    <div className="relative w-full h-full aspect-video bg-black">
      {/* Placeholder video player */}
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Video Player</p>
          <p className="text-sm opacity-75">
            {videoState.isIdle 
              ? 'Idle Mode' 
              : videoState.currentModuleIndex === -1 
                ? 'Select a module to begin'
                : `Module ${videoState.currentModuleIndex + 1}`
            }
          </p>
        </div>
      </div>


    </div>
  )
} 