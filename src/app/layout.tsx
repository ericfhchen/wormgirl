'use client'

import './globals.css'
import React from 'react'
import { VideoProvider } from '@/context/VideoContext'
import { PageStateProvider } from '@/context/PageStateContext'
import { ModulesProvider } from '@/context/ModulesContext'
import { ContentPagesProvider } from '@/context/ContentPagesContext'
import { usePageState } from '@/context/PageStateContext'
import VideoPlayerStacked from '@/components/VideoPlayerStacked'
import IntroOverlay from '@/components/IntroOverlay'
import Sidebar from '@/components/Sidebar'
import ContentPanel from '@/components/ContentPanel'
import MobileTopMenu from '@/components/MobileTopMenu'
import MobileModuleBar from '@/components/MobileModuleBar'
import { useModules } from '@/context/ModulesContext'
import { useVideo } from '@/context/VideoContext'
import PreLoader from '@/components/PreLoader'
// No persistence – intro overlay resets on each page load

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [introDone, setIntroDone] = React.useState(false)

  // Intro overlay shown by default until user finishes it


  const handleIntroFinish = () => {
    setIntroDone(true)
  }

  return (
    <html lang="en">
      <body className="font-sans overflow-hidden">
        <PreLoader />
        <ContentPagesProvider>
          <ModulesProvider>
            <VideoProvider>
              <PageStateProvider>
                <LayoutContent>
                  {children}
                </LayoutContent>
                {!introDone && <IntroOverlay onFinish={handleIntroFinish} />}
              </PageStateProvider>
            </VideoProvider>
          </ModulesProvider>
        </ContentPagesProvider>
      </body>
    </html>
  )
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { state: pageState } = usePageState()
  const isPanelVisibleDesktop = pageState.contentPanelStage !== 'hidden'
  const { state: modulesState } = useModules()
  const { state: videoState, dispatch: videoDispatch } = useVideo()

  // Calculate sidebar position based on panel size
  const getSidebarRightPosition = () => {
    if (!isPanelVisibleDesktop) return '0px'
    // Use 80vw when maximized, otherwise 384px (w-96)
    return pageState.isPanelMaximized ? '80vw' : '384px'
  }

  // No automatic Prelude start – handled by user click

  return (
    <div className="relative h-screen bg-dark overflow-hidden">
      {/* Video Player – fills viewport minus sidebar on desktop */}
      <div
        className="absolute top-0 left-0 h-full bg-black w-full lg:w-[calc(100vw-200px)]"
      >
        <VideoPlayerStacked />
      </div>

      {/* Page content rendered here - positioned above video */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:block absolute top-0 h-full border-l border-light overflow-hidden z-20 bg-dark/95 backdrop-blur-sm w-sidebar" 
        style={{ 
          right: getSidebarRightPosition(),
          transition: 'right 0.3s ease-in-out'
        }}
      >
        <Sidebar />
      </aside>

      {/* Content Panel - single instance handles both mobile and desktop */}
      <ContentPanel />

      {/* Mobile UI */}
      <MobileTopMenu />
      <MobileModuleBar />
    </div>
  )
} 