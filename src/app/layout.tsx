import './globals.css'
import { Inter } from 'next/font/google'
import { VideoProvider } from '@/context/VideoContext'
import { PageStateProvider } from '@/context/PageStateContext'
import VideoPlayer from '@/components/VideoPlayer'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Educational Video App',
  description: 'Interactive educational content with video modules',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <VideoProvider>
          <PageStateProvider>
            <div className="flex h-screen bg-background">
              {/* Sidebar */}
              <aside className="w-sidebar flex-shrink-0 border-r border-border">
                <Sidebar />
              </aside>

              {/* Main content area */}
              <main className="flex-1 flex flex-col overflow-hidden">
                {/* Video Player */}
                <div className="relative bg-black">
                  <VideoPlayer />
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-auto">
                  {children}
                </div>
              </main>
            </div>
          </PageStateProvider>
        </VideoProvider>
      </body>
    </html>
  )
} 