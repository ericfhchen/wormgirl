'use client'

import './globals.css'
import React from 'react'
import { VideoProvider } from '@/context/VideoContext'
import { PageStateProvider } from '@/context/PageStateContext'
import { ModulesProvider } from '@/context/ModulesContext'
import { usePageState } from '@/context/PageStateContext'
import VideoPlayer from '@/components/VideoPlayer'
import Sidebar from '@/components/Sidebar'
import ContentPanel from '@/components/ContentPanel'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans overflow-hidden">
        <ModulesProvider>
          <VideoProvider>
            <PageStateProvider>
              <LayoutContent>
                {children}
              </LayoutContent>
            </PageStateProvider>
          </VideoProvider>
        </ModulesProvider>
      </body>
    </html>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { state: pageState } = usePageState()

  return (
    <div className="relative h-screen bg-dark overflow-hidden">
      {/* Video Player - Full width background */}
      <div className="absolute inset-0 w-full h-full bg-black">
        <VideoPlayer />
      </div>

      {/* Page content rendered here - positioned above video */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Sidebar - positioned to leave space for content panel when expanded */}
      <aside 
        className="absolute top-0 h-full border-l border-light overflow-hidden z-20 bg-dark/95 backdrop-blur-sm w-sidebar" 
        style={{ 
          right: pageState.isContentPanelExpanded ? '384px' : '0px',
          transition: 'right 0.4s ease-in-out'
        }}
      >
        <Sidebar />
      </aside>

      {/* Content Panel - positioned at right edge, slides in from left */}
      <div className="absolute top-0 right-0 h-full z-30">
        <ContentPanel />
      </div>
    </div>
  )
} 