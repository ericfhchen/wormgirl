'use client'

import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'

export default function Sidebar() {
  const { state: videoState, playModule } = useVideo()
  const { state: pageState, setCurrentPage, setModulePage, expandContentPanel } = usePageState()

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
    <div className="h-full flex flex-col bg-dark">
      {/* Header */}
      <div className="p-1 border-b border-light">
        <div className="flex items-center justify-end">
          {/* Content panel expand button - only show when collapsed */}
          {!pageState.isContentPanelExpanded && (
            <button
              onClick={expandContentPanel}
              className="p-3 hover:bg-dark rounded transition-colors"
              title="Show content panel"
            >
              <svg
                className="w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar justify-between">
        {/* Educational Modules */}
        <div className="p-0">
          <div className="space-y-0">
            {mockModules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => handleModuleClick(index, module.slug)}
                className={`group w-full text-left p-0 transition-colors ${
                  pageState.currentPage === 'module' && videoState.currentModuleIndex === index
                    ? 'bg-light text-dark'
                    : 'hover:bg-light hover:text-primary'
                }`}
              >
                <div className="flex flex-col p-3 pb-8 justify-start space-y-1 border-b border-light">
                  <div className={`w-6 h-6 justify-center text-xl font-serif font-bold ${
                    videoState.currentModuleIndex === index
                      ? 'text-dark'
                      : 'text-light group-hover:text-dark'
                  }`}>
                    {module.order}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{module.title}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {/* Logo */}
          <div className="p-2 pb-3">
            <div className="flex justify-center">
              <img src="/WORMGIRL_TEXT_LOGO_FINAL.svg" alt="Worm Girl" className="" />
            </div>
          </div>

          {/* Content Pages */}
          <div className="p-0 border-t border-light">
            <div className="">
              {contentPages.map((page) => (
                <button
                  key={page.slug}
                  onClick={() => handleContentPageClick(page.pageType, page.slug)}
                  className={`w-full text-left px-3 py-2 transition-colors border-b border-light text-sm ${
                    pageState.currentPage === page.pageType
                      ? 'bg-light text-dark'
                      : 'hover:bg-light hover:text-dark'
                  }`}
                >
                  <p className="font-medium">{page.title}</p>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 text-xs text-muted">
              © {new Date().getFullYear()} Worm Girl
            </div>
          </div>
        </div>

      </div>


    </div>
  )
} 