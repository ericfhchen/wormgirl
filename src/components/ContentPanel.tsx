'use client'

import { useState, useEffect } from 'react'
import { PortableText } from '@portabletext/react'
import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'
import { getModules, SanityModule } from '@/lib/sanity'

export default function ContentPanel() {
  const { state: pageState, toggleContentPanel } = usePageState()
  const { state: videoState } = useVideo()
  const [modules, setModules] = useState<SanityModule[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch modules from Sanity
  useEffect(() => {
    async function fetchModules() {
      try {
        const fetchedModules = await getModules()
        setModules(fetchedModules)
      } catch (error) {
        console.error('Error fetching modules:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchModules()
  }, [])

  // Get current module based on currentModuleIndex
  const currentModule = videoState.currentModuleIndex >= 0 && videoState.currentModuleIndex < modules.length
    ? modules[videoState.currentModuleIndex]
    : null

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

  const renderModuleContent = () => {
    if (loading) {
      return (
        <div className="p-6">
          <div className="text-center text-muted">
            Loading module content...
          </div>
        </div>
      )
    }

    if (!currentModule) {
      return (
        <div className="p-6">
          <div className="text-center text-muted">
            <p className="text-sm">No module selected</p>
            <p className="text-xs mt-2">Select a module from the sidebar to view its content</p>
          </div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <div className="max-w-none">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-light mb-2">
              {currentModule.title}
            </h1>
            {currentModule.excerpt && (
              <p className="text-muted text-sm">
                {currentModule.excerpt}
              </p>
            )}
          </header>

          <div className="prose-custom text-sm">
            {currentModule.body && currentModule.body.length > 0 ? (
              <PortableText  
                value={currentModule.body}
                components={{
                  block: {
                    normal: ({children}) => <p className="leading-relaxed mb-4 text-light">{children}</p>,
                    h1: ({children}) => <h1 className="text-lg font-bold mb-3 text-light">{children}</h1>,
                    h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-light">{children}</h2>,
                    h3: ({children}) => <h3 className="text-sm font-semibold mb-2 text-light">{children}</h3>,
                    blockquote: ({children}) => <blockquote className="border-l-2 border-light pl-4 italic mb-4 text-muted">{children}</blockquote>,
                  },
                  list: {
                    bullet: ({children}) => <ul className="text-sm space-y-1 mb-4 list-disc list-inside text-light">{children}</ul>,
                    number: ({children}) => <ol className="text-sm space-y-1 mb-4 list-decimal list-inside text-light">{children}</ol>,
                  },
                  listItem: {
                    bullet: ({children}) => <li className="text-light">{children}</li>,
                    number: ({children}) => <li className="text-light">{children}</li>,
                  },
                  marks: {
                    strong: ({children}) => <strong className="font-bold text-light">{children}</strong>,
                    em: ({children}) => <em className="italic text-light">{children}</em>,
                    link: ({children, value}) => (
                      <a href={value?.href} className="text-light underline hover:text-primary" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  },
                  types: {
                    image: ({value}) => (
                      <div className="my-4">
                        <img 
                          src={value.asset.url} 
                          alt={value.alt || ''} 
                          className="w-full rounded-lg"
                        />
                        {value.caption && (
                          <p className="text-xs text-muted mt-2 text-center">{value.caption}</p>
                        )}
                      </div>
                    ),
                  },
                }}
              />
            ) : (
              <div className="text-center text-muted">
                <p className="text-sm">No content available for this module</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

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
    <div className="w-96 border-l border-light bg-dark flex flex-col animate-slide-in-right overflow-hidden">
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