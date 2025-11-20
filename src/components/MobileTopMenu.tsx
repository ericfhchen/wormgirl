'use client'

import { usePageState } from '@/context/PageStateContext'
import { useRef, useState, useEffect } from 'react'
import { useContentPages } from '@/context/ContentPagesContext'
import { urlFor, type SanityCategorySection, type SanityTextBlock } from '@/lib/sanity'
import { PortableText } from '@portabletext/react'
import Image from 'next/image'

export default function MobileTopMenu() {
  const containerRef = useRef<HTMLDivElement>(null)
  const topMenuRef = useRef<HTMLDivElement>(null)
  const closeBarRef = useRef<HTMLDivElement>(null)
  const menuOptionsRef = useRef<HTMLDivElement>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)
  
  const {
    state: pageState,
    toggleTopMenu,
    closeTopMenu,
    collapseContentPanel,
  } = usePageState()

  const { state: contentPagesState, getPageByType, getPageBySlug } = useContentPages()
  
  // Local state for mobile top menu content - doesn't affect global page state
  const [selectedMenuTab, setSelectedMenuTab] = useState<string | null>(null)
  const [contentPanelHeight, setContentPanelHeight] = useState<string>('60vh')

  // Reset selected tab when menu closes
  useEffect(() => {
    if (!pageState.isTopMenuOpen) {
      setSelectedMenuTab(null)
    }
  }, [pageState.isTopMenuOpen])

  // Reset scroll position when switching tabs
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [selectedMenuTab])

  // Calculate dynamic height based on actual rendered elements
  useEffect(() => {
    if (!pageState.isTopMenuOpen) return

    const calculateHeight = () => {
      const closeBarHeight = closeBarRef.current?.offsetHeight || 0
      const menuOptionsHeight = menuOptionsRef.current?.offsetHeight || 0
      const moduleBarElement = document.getElementById('mobile-module-bar')
      const moduleBarHeight = moduleBarElement?.offsetHeight || 0
      
      const totalReservedHeight = closeBarHeight + menuOptionsHeight + moduleBarHeight
      const availableHeight = window.innerHeight - totalReservedHeight
      
      setContentPanelHeight(`${availableHeight}px`)
    }

    // Calculate after elements are rendered
    const timer = setTimeout(calculateHeight, 100)
    
    // Recalculate on resize
    const handleResize = () => calculateHeight()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [pageState.isTopMenuOpen, selectedMenuTab])

  const contentPages = contentPagesState.pages

  const handlePageClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    slug: string
  ) => {
    // Use local state instead of global state to avoid affecting bottom content panel
    setSelectedMenuTab(slug)
    // Don't call closeTopMenu() or setCurrentPage() - keep menu open and don't affect global state
    
    // Snap selected tab to the left edge
    if (containerRef.current) {
      const button = e.currentTarget as HTMLButtonElement
      const container = containerRef.current
      container.scrollTo({ left: button.offsetLeft, behavior: 'smooth' })
    }
  }

  // Section rendering functions (same as ContentPanel)
  const renderCategorySection = (section: SanityCategorySection) => (
    <section key={`category-${section.title || 'untitled'}`} className="space-y-4">
      {section.title && (
        <h2 className="text-lg font-semibold mb-3 text-light">{section.title}</h2>
      )}
      <div className="grid grid-cols-1 gap-4">
        {section.categories?.map((category, index) => (
          <div key={`category-${index}`} className="p-4 border border-light rounded-lg">
            {category.image && (
              <div className="w-full h-24 bg-dark rounded-lg mb-3 overflow-hidden">
                <img
                  src={urlFor(category.image).width(400).height(200).quality(80).url()}
                  alt={category.title || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <h3 className="font-medium mb-1 text-sm text-light">{category.title}</h3>
            {category.description && (
              <p className="text-xs text-muted">{category.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )


  const renderTextBlockSection = (section: SanityTextBlock) => (
    <section key={`text-${Math.random()}`} className="prose-custom">
      <PortableText 
        value={section.content} 
        components={{
          block: {
            normal: ({children}: any) => <p className="leading-normal mb-4 text-light">{children}</p>,
            h1: ({children}: any) => <h1 className="text-lg font-bold mb-3 text-light">{children}</h1>,
            h2: ({children}: any) => <h2 className="text-base font-semibold mb-2 text-light">{children}</h2>,
            h3: ({children}: any) => <h3 className="text-sm font-semibold mb-2 text-light">{children}</h3>,
          },
          list: {
            bullet: ({children}: any) => <ul className="text-sm space-y-1 mb-4 custom-bullet-list text-light">{children}</ul>,
            number: ({children}: any) => <ol className="text-sm space-y-1 mb-4 list-decimal list-inside text-light">{children}</ol>,
          },
          listItem: {
            bullet: ({children}: any) => <li className="text-light">{children}</li>,
            number: ({children}: any) => <li className="text-light">{children}</li>,
          },
          marks: {
            strong: ({children}: any) => <strong className="font-bold text-light">{children}</strong>,
            em: ({children}: any) => <em className="italic text-light">{children}</em>,
            smallCaps: ({children}: any) => <span className="font-sc text-light">{children}</span>,
            link: ({children, value}: any) => (
              <a href={value?.href} className="text-light underline hover:text-primary" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          },
          types: {
            image: ({ value }: { value: any }) => {
              // Get original dimensions for aspect ratio
              let origW: number | undefined = value?.asset?.metadata?.dimensions?.width
              let origH: number | undefined = value?.asset?.metadata?.dimensions?.height

              if (!origW || !origH) {
                const ref: string | undefined = value?.asset?._ref
                const match = ref?.match(/-(\d+)x(\d+)-/)
                if (match) {
                  origW = parseInt(match[1], 10)
                  origH = parseInt(match[2], 10)
                }
              }

              // Fall back to a sane default if we still cannot determine dimensions
              origW = origW || 800
              origH = origH || 600

              return (
                <div className="mb-6">
                  <img
                    src={urlFor(value).width(600).quality(80).url()}
                    alt={value.alt || ''}
                    className="w-full h-auto block"
                    loading="lazy"
                    style={{ aspectRatio: `${origW}/${origH}`, margin: 0, padding: 0 }}
                  />
                  {value.caption && (
                    <p className="text-xs italic mt-2 text-light" style={{fontFamily: 'Baskervville'}}>{value.caption}</p>
                  )}
                </div>
              )
            },
            spotifyEmbed: ({ value }: { value: { url: string; height?: number } }) => {
              if (!value?.url) return null

              // Convert Spotify URL to embed URL
              const embedUrl = value.url.replace('open.spotify.com/', 'open.spotify.com/embed/')
              const height = value.height || 380

              return (
                <div className="my-6">
                  <iframe 
                    src={embedUrl}
                    width="100%"
                    height={height}
                    frameBorder="0"
                    allowTransparency={true}
                    allow="encrypted-media"
                    loading="lazy"
                    className="rounded-lg"
                  />
                </div>
              )
            },
          },
        }} 
      />
    </section>
  )

  const renderTopMenuContent = () => {
    // Only render content when a menu tab is selected and top menu is open
    if (!selectedMenuTab || !pageState.isTopMenuOpen) {
      return null
    }

    if (contentPagesState.loading) {
      return (
        <div className="bg-black" style={{ height: contentPanelHeight }}>
          <div className="p-6">
            <div className="text-center text-muted">
              Loading page content...
            </div>
          </div>
        </div>
      )
    }

    const currentPageData = selectedMenuTab ? getPageBySlug(selectedMenuTab) : null
    
    if (!currentPageData) {
      return (
        <div className="bg-black" style={{ height: contentPanelHeight }}>
          <div className="p-6">
            <div className="text-center text-muted">
              <p className="text-sm">Page not found</p>
              <p className="text-xs mt-2">No content available for {selectedMenuTab}</p>
            </div>
          </div>
        </div>
      )
    }

    // Default rendering for other pages (consulting, installations, about)
    return (
      <div ref={contentScrollRef} className="bg-black overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={{ height: contentPanelHeight }}>
        <div className="p-4 pb-6">


          <div className="space-y-8">
            {currentPageData.sections?.length > 0 ? (
              currentPageData.sections.map((section, index) => {
                switch (section._type) {
                  case 'categorySection':
                    return renderCategorySection(section as SanityCategorySection)
                  case 'textBlock':
                    return renderTextBlockSection(section as SanityTextBlock)
                  default:
                    return (
                      <div key={`unknown-${index}`} className="text-muted">
                        <p className="text-sm">Unsupported section type: {section._type}</p>
                      </div>
                    )
                }
              })
            ) : (
              <div className="text-center text-muted">
                <p className="text-sm">No content sections available</p>
                <p className="text-xs mt-2">Add sections to this page in the Sanity Studio</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* MENU button shown when the top menu is closed */}
      {!pageState.isTopMenuOpen && (
        <button
          onClick={toggleTopMenu}
          className="md:hidden fixed top-3 left-3 z-50 text-light text-xs uppercase tracking-widest font-serif font-extrabold"
        >
          MENU
        </button>
      )}

      {/* Top menu, only rendered when open */}
      {pageState.isTopMenuOpen && (
        <div ref={topMenuRef} className="md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col" style={{ bottom: 'var(--mobile-module-bar-height, 0px)' }}>
          {/* Close bar */}
          <div ref={closeBarRef} className="relative flex items-center bg-dark border-b border-light p-3 flex-shrink-0">
            <button
              onClick={() => {
                // When closing top menu, also collapse the bottom content panel if it's showing content
                if (pageState.currentPage === 'content' && pageState.contentPanelStage !== 'hidden') {
                  collapseContentPanel()
                }
                toggleTopMenu()
              }}
              className="text-light text-xs font-serif uppercase tracking-widest font-extrabold"
            >
              × Close
            </button>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Image
                src="/WORMGIRL_TEXT_LOGO_FINAL.svg"
                alt="Worm Girl"
                width={120}
                height={24}
                className="h-3.5 w-auto"
              />
            </div>
          </div>

          {/* Menu options - tab style like module bar */}
          <div ref={menuOptionsRef} className="bg-black border-b border-light w-full flex-shrink-0">
            <div
              ref={containerRef}
              className="flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {contentPages.map((page, index) => {
                const isActive = selectedMenuTab === page.slug?.current
                const isFirst = index === 0
                const isLast = index === contentPages.length - 1

                // Border logic: only top, bottom, and left borders; remove left on first, right on last
                const borderClasses = `${isFirst ? 'border-l-0' : 'border-l'} ${
                  isLast ? 'border-r-0' : ''
                } border-light`

                return (
                  <button
                    key={page.slug?.current || page._id}
                    onClick={(e) => handlePageClick(e, page.slug?.current || page._id)}
                    className={`group flex-shrink-0 w-44 snap-start text-left p-0 transition-colors ${
                      isActive ? 'bg-light text-dark' : 'hover:bg-light hover:text-primary'
                    } ${borderClasses}`}
                  >
                    <div className="flex flex-col h-full p-3 pb-10 justify-start">
                      <div className="mb-1">
                        <p className="font-medium text-xs">{page.title}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content area that appears below menu options */}
          {renderTopMenuContent()}
        </div>
      )}
    </>
  )
} 