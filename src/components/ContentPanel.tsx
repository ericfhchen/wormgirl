'use client'

import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'

export default function ContentPanel() {
  const { state: pageState, toggleContentPanel } = usePageState()
  const { state: videoState } = useVideo()

  // Mock content for different pages
  const mockModuleContent = {
    title: "Module Content",
    content: "This is where the rich text content from Sanity will be displayed using Portable Text components."
  }

  const mockContentPageData = {
    consulting: {
      title: "Consulting Services",
      content: "Professional consulting services for your business needs."
    },
    stills: {
      title: "Photography Portfolio",
      content: "A curated collection of still photography work."
    },
    installations: {
      title: "Art Installations",
      content: "Interactive and immersive art installations."
    },
    about: {
      title: "About Us",
      content: "Learn more about our mission and team."
    }
  }

  const renderModuleContent = () => (
    <div className="p-6">
      <div className="max-w-none">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-light mb-2">
            Module {videoState.currentModuleIndex + 1}: {mockModuleContent.title}
          </h1>
          <p className="text-muted text-sm">
            Educational content synchronized with the video
          </p>
        </header>

        <div className="prose-custom text-sm">
          <p className="leading-relaxed mb-4">
            {mockModuleContent.content}
          </p>
          
          <h3 className="text-base font-semibold mb-2">Key Learning Points</h3>
          <ul className="text-sm space-y-1 mb-4">
            <li>Understanding the fundamentals</li>
            <li>Practical application techniques</li>
            <li>Real-world examples and case studies</li>
            <li>Best practices and common pitfalls</li>
          </ul>

          <h3 className="text-base font-semibold mb-2">Interactive Elements</h3>
          <p className="text-sm mb-2">
            This is where custom Portable Text components would render:
          </p>
          <ul className="text-sm space-y-1 mb-4">
            <li><strong>Footnotes</strong> - Hover to reveal additional information</li>
            <li><strong>Hover Images</strong> - Interactive image overlays</li>
            <li><strong>Inline Videos</strong> - Supporting video content</li>
          </ul>

          <div className="mt-6 p-4 bg-dark rounded-lg">
            <h3 className="font-medium mb-2 text-sm">About This Module</h3>
            <p className="text-xs text-muted">
              This module demonstrates the educational content system with 
              video-first learning and rich text articles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContentPage = () => {
    const currentPageData = mockContentPageData[pageState.currentPage as keyof typeof mockContentPageData]
    
    if (!currentPageData) return null

    return (
      <div className="p-6">
        <div className="max-w-none">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-light mb-2">
              {currentPageData.title}
            </h1>
            <p className="text-muted text-sm">
              Flexible content page with modular sections
            </p>
          </header>

          <div className="space-y-6">
            {/* Mock Category Section */}
            <section>
              <h2 className="text-lg font-semibold mb-3">Categories</h2>
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-4 border border-light rounded-lg">
                    <div className="w-full h-24 bg-dark rounded-lg mb-3"></div>
                    <h3 className="font-medium mb-1 text-sm">Category {item}</h3>
                    <p className="text-xs text-muted">
                      Description of this category and its relevance.
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Mock Text Block */}
            <section className="prose-custom">
              <h3 className="text-base font-semibold mb-2">About This Page</h3>
              <p className="text-sm mb-3">{currentPageData.content}</p>
              <p className="text-sm mb-2">
                This page demonstrates the flexible content system using Sanity&apos;s 
                modular sections.
              </p>
            </section>
          </div>
        </div>
      </div>
    )
  }

  if (!pageState.isContentPanelExpanded) {
    return null
  }

  return (
    <div className="w-96 border-l border-light bg-dark flex flex-col animate-slide-in-right">
      {/* Panel header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-light bg-dark/30">
        <h2 className="font-semibold text-light text-sm">
          {pageState.currentPage === 'module' ? 'Module Content' : 'Page Content'}
        </h2>
        <button
          onClick={toggleContentPanel}
          className="p-1 hover:bg-dark rounded transition-colors"
          aria-label="Collapse content panel"
        >
          <svg
            className="w-4 h-4 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
      </div>
    </div>
  )
} 