import './globals.css'
import { Suspense } from 'react'
import { VideoProvider } from '@/context/VideoContext'
import { PageStateProvider } from '@/context/PageStateContext'
import VideoPlayer from '@/components/VideoPlayer'
import Sidebar from '@/components/Sidebar'
import ContentPanel from '@/components/ContentPanel'

export const metadata = {
  title: 'Worm Girl - Educational Video App',
  description: 'Interactive educational content with video modules',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans overflow-hidden">
        <VideoProvider>
          <PageStateProvider>
            <div className="flex h-screen bg-dark overflow-hidden">
              {/* Main content area - video player */}
              <main className="flex-1 flex flex-col overflow-hidden">
                {/* Video Player */}
                <div className="relative h-full bg-black overflow-hidden">
                  <VideoPlayer />
                </div>

                {/* Video area when content panel is collapsed */}
                <div className="flex-1 bg-black"></div>
              </main>

              {/* Sidebar - on the right */}
              <aside className="w-sidebar flex-shrink-0 border-l border-light overflow-hidden">
                <Sidebar />
              </aside>

              {/* Content Panel - collapsible */}
              <Suspense fallback={<div>Loading...</div>}>
                <ContentPanel />
              </Suspense>
            </div>
          </PageStateProvider>
        </VideoProvider>
      </body>
    </html>
  )
} 