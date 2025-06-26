import { VideoProvider } from '@/context/VideoContext'
import { PageStateProvider } from '@/context/PageStateContext'
import VideoPlayer from '@/components/VideoPlayer'
import Sidebar from '@/components/Sidebar'
import ContentPanel from '@/components/ContentPanel'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <VideoProvider>
      <PageStateProvider>
        <div className="flex h-screen bg-dark">
          {/* Main content area - video player */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Video Player */}
            <div className="relative h-full bg-black">
              <VideoPlayer />
            </div>

            {/* Video area when content panel is collapsed */}
            <div className="flex-1 bg-black"></div>
          </main>

          {/* Sidebar - on the right */}
          <aside className="w-sidebar flex-shrink-0 border-l border-light">
            <Sidebar />
          </aside>

          {/* Content Panel - collapsible */}
          <ContentPanel />
        </div>
      </PageStateProvider>
    </VideoProvider>
  )
} 