'use client'

import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'

export default function Sidebar() {
  const { state: videoState, playModule } = useVideo()
  const { state: pageState, setCurrentPage, setModulePage } = usePageState()

  // Mock data - this will be replaced with actual Sanity data
  const mockModules = [
    { id: 1, title: "Introduction to Design", slug: "intro-design", order: 1 },
    { id: 2, title: "Color Theory", slug: "color-theory", order: 2 },
    { id: 3, title: "Typography Basics", slug: "typography", order: 3 },
    { id: 4, title: "Layout Principles", slug: "layout", order: 4 },
  ]

  const contentPages = [
    { slug: 'consulting', title: 'Consulting', pageType: 'consulting' as const },
    { slug: 'stills', title: 'Stills', pageType: 'stills' as const },
    { slug: 'installations', title: 'Installations', pageType: 'installations' as const },
    { slug: 'about', title: 'About', pageType: 'about' as const },
  ]

  const handleModuleClick = (index: number, slug: string) => {
    playModule(index)
    setModulePage(index, slug)
  }

  const handleContentPageClick = (pageType: string, slug: string) => {
    setCurrentPage(pageType as any, slug)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">
          Educational App
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Interactive Learning Experience
        </p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Educational Modules */}
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Modules
          </h2>
          <div className="space-y-1">
            {mockModules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => handleModuleClick(index, module.slug)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  pageState.currentPage === 'module' && videoState.currentModuleIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    videoState.currentModuleIndex === index
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {module.order}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{module.title}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content Pages */}
        <div className="p-4 border-t border-border">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Pages
          </h2>
          <div className="space-y-1">
            {contentPages.map((page) => (
              <button
                key={page.slug}
                onClick={() => handleContentPageClick(page.pageType, page.slug)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  pageState.currentPage === page.pageType
                    ? 'bg-secondary text-secondary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <p className="font-medium">{page.title}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>Current: {pageState.currentPage}</p>
          {pageState.currentPage === 'module' && (
            <p>Module: {videoState.currentModuleIndex + 1}</p>
          )}
        </div>
      </div>
    </div>
  )
} 