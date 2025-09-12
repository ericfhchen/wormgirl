'use client'

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { PortableText, type PortableTextReactComponents } from '@portabletext/react'
import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { useContentPages } from '@/context/ContentPagesContext'
import { urlFor, type SanityCategorySection, type SanityImageGallerySection, type SanityTextBlock } from '@/lib/sanity'
import { useFootnotes } from '@/lib/hooks/useFootnotes'
import { useGlossary } from '@/lib/hooks/useGlossary'
import useIsMobile from '@/lib/hooks/useIsMobile'
import Image from 'next/image'

export default function ContentPanel() {
  const { state: pageState, toggleContentPanel, isContentPanelExpanded, expandContentPanel, showPeek, setPanelMaximized } = usePageState()
  const isMobile = useIsMobile()
  const { state: videoState } = useVideo()
  const { state: modulesState, getModule } = useModules()
  const { state: contentPagesState, getPageByType, getPageBySlug } = useContentPages()
  
  // Current panel stage
  const stage = pageState.contentPanelStage

  // Track contentKey to detect module changes for fade logic
  const [contentKey, setContentKey] = useState(0)

  // Handle instant hide + delayed fade-in when module content changes
  const [isHidden, setIsHidden] = useState(false)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)

  // State for vertical tabs (used in stills page)
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  
  // State for stills gallery view modes
  const [galleryViewMode, setGalleryViewMode] = useState<'tabs' | 'expanded' | 'maximized'>('tabs')

  const prevContentKeyRef = useRef(contentKey)
  const prevStageRef = useRef(stage)

  // Track initial Y position for swipe gesture detection (must be before early returns)
  const touchStartYRef = useRef<number | null>(null)

  // Ref to scroll container for resetting scroll position on module change
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isMobile) return

    // Detect module/page change
    if (prevContentKeyRef.current !== contentKey) {
      // Instantly hide text (no transition)
      setIsHidden(true)

      // Delay showing depending on whether panel is sliding from expanded → peek
      const delay = prevStageRef.current === 'expanded' ? 500 : 0

      const timeout = setTimeout(() => {
        setIsHidden(false)
        setShouldFadeIn(true) // trigger fade animation

        // reset flag after animation duration so future stage toggles don't animate
        setTimeout(() => setShouldFadeIn(false), 400)
      }, delay)

      // Update refs for next change
      prevContentKeyRef.current = contentKey
      prevStageRef.current = stage

      return () => clearTimeout(timeout)
    }
  }, [contentKey, isMobile, stage])

  // State to handle closing animation
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  // Handle panel visibility and animation states
  useEffect(() => {
    const shouldBeVisible = pageState.contentPanelStage !== 'hidden'

    if (shouldBeVisible) {
      setIsVisible(true)
      setIsAnimatingOut(false)
    } else if (isVisible) {
      // Start closing animation
      setIsAnimatingOut(true)
      // Hide after animation completes
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setIsAnimatingOut(false)
      }, 300)

      return () => clearTimeout(timeout)
    }
  }, [pageState.contentPanelStage, isVisible])

  // Determine which module index should drive the UI: if a user has selected a new
  // module (stored on pageState.previousModuleIndex) use that immediately,
  // otherwise fall back to the currently playing video index.
  const selectedModuleIndex = useMemo(() => {
    return pageState.previousModuleIndex !== null
      ? pageState.previousModuleIndex
      : videoState.currentModuleIndex
  }, [pageState.previousModuleIndex, videoState.currentModuleIndex])

  // Previously we bumped a `contentKey` to force-remount the panel when module
  // changed. This remount was also triggering repeated image reloads in Chrome.
  // With the flicker issue fixed we no longer need this; comment it out to keep
  // the DOM instance stable across renders.
  useEffect(() => {
    setContentKey(prev => prev + 1)
    // Reset scroll position to top when content changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0 })
    }
    // Reset active tab index and gallery view mode when page changes
    setActiveTabIndex(0)
    setGalleryViewMode('tabs')
    setPanelMaximized(false)
  }, [selectedModuleIndex, pageState.currentPage])

  // Get current module from centralized context
  const rawModule = getModule(selectedModuleIndex)

  const currentModule = useMemo(() => rawModule, [rawModule?._id])

  // Memoize footnotes to prevent new array creation on every render
  // Always provide an empty array to ensure hooks are called consistently
  const footnotes = useMemo(() => {
    return (pageState.currentPage === 'module' && currentModule?.footnotes) ? currentModule.footnotes : []
  }, [pageState.currentPage, currentModule?.footnotes])

  // Memoize glossary terms to prevent new array creation on every render
  // Always provide an empty array to ensure hooks are called consistently
  const glossaryTerms = useMemo(() => {
    return (pageState.currentPage === 'module' && currentModule?.glossary) ? currentModule.glossary : []
  }, [pageState.currentPage, currentModule?.glossary])

  // ----- Footnotes / glossary hooks -----
  // Always call these hooks with consistent parameters
  const {
    registerFootnoteRef,
    getReferencedFootnotes,
    scrollToFootnote,
    scrollToReference,
    footnotesMap
  } = useFootnotes(footnotes, isMobile)

  const {
    registerGlossaryRef,
    getReferencedGlossaryTerms,
    scrollToGlossaryTerm,
    scrollToGlossaryReference,
    glossaryMap
  } = useGlossary(glossaryTerms, isMobile)

  // Force a re-render after refs are collected so the definition lists mount
  const [refsVersion, setRefsVersion] = useState(0)

  // ------------------------------------------------------------
  // Register footnotes and glossary references after render
  // Only process on module pages to avoid processing null content
  // ------------------------------------------------------------
  useEffect(() => {
    if (pageState.currentPage === 'module' && currentModule?.body) {
      const walkContent = (content: any[]) => {
        content.forEach(item => {
          if (item._type === 'block' && item.markDefs) {
            item.markDefs.forEach((mark: any) => {
              if (mark._type === 'footnoteRef') {
                registerFootnoteRef(mark.footnoteId)
              } else if (mark._type === 'glossaryRef') {
                registerGlossaryRef(mark.glossaryId)
              }
            })
          }
          if (item.children) {
            walkContent(item.children)
          }
        })
      }

      walkContent(currentModule.body)

      // refs collected → trigger one re-render to show definitions
      setRefsVersion(v => v + 1)
    }
  }, [pageState.currentPage, currentModule?.body]) // Remove registration functions from dependencies

  // Memoize referenced terms to prevent unnecessary re-renders
  const referencedGlossaryTerms = useMemo(
    () => getReferencedGlossaryTerms(),
    [refsVersion]
  )

  const referencedFootnotes = useMemo(
    () => getReferencedFootnotes(),
    [refsVersion]
  )

  // Memoize the PortableText components to prevent recreation on every render
  const portableTextComponents = useMemo(() => ({
    block: {
      normal: ({children}: any) => <p className="leading-normal mb-4 text-light">{children}</p>,
      h1: ({children}: any) => <h1 className="text-lg font-bold mb-3 text-light">{children}</h1>,
      h2: ({children}: any) => <h2 className="text-base font-semibold mb-2 text-light">{children}</h2>,
      h3: ({children}: any) => <h3 className="text-sm font-semibold mb-2 text-light">{children}</h3>,
      intro: ({children}: any) => <blockquote className="border-l-0 border-light pl-12 font-serif font-semibold italic my-10 text-light text-lg leading-0.5">{children}</blockquote>,
      blockquote: ({children}: any) => <blockquote className="border-l-0 border-light pl-4 font-serif font-semibold italic my-10 text-light text-lg leading-0.5">{children}</blockquote>,
    },
    list: {
      bullet: ({children}: any) => <ul className="text-sm space-y-1 mb-4 list-disc list-inside text-light">{children}</ul>,
      number: ({children}: any) => <ol className="text-sm space-y-1 mb-4 list-decimal list-inside text-light">{children}</ol>,
    },
    listItem: {
      bullet: ({children}: any) => <li className="text-light">{children}</li>,
      number: ({children}: any) => <li className="text-light">{children}</li>,
    },
    marks: {
      strong: ({children}: any) => <strong className="font-bold text-light">{children}</strong>,
      em: ({children}: any) => <em className="italic text-light">{children}</em>,
      link: ({children, value}: any) => (
        <a href={value?.href} className="text-light underline hover:text-primary" target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ),
      footnoteRef: ({value}: {value?: {footnoteId: string}}) => {
        // Get footnote number directly from map without calling registration function
        const footnoteNumber = footnotesMap.get(value!.footnoteId)?.number || '?'
        return (
          <button
            id={`footnote-ref-${value!.footnoteId}`}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToFootnote(value!.footnoteId)
            }}
            className="inline-block text-light hover:text-muted transition-colors cursor-pointer text-xs align-super font-medium"
            title={`Go to footnote ${footnoteNumber}`}
          >
            [{footnoteNumber}]
          </button>
        )
      },
      glossaryRef: ({value}: {value?: {glossaryId: string}}) => {
        // Get glossary term directly from map without calling registration function
        const glossaryTerm = glossaryMap.get(value!.glossaryId)?.term || '?'
        return (
          <button
            id={`glossary-ref-${value!.glossaryId}`}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToGlossaryTerm(value!.glossaryId)
            }}
            className="glossary-term text-light hover:text-muted transition-colors cursor-pointer font-medium"
            title={`Go to glossary term: ${glossaryTerm}`}
          >
            {glossaryTerm}
          </button>
        )
      },
    },
    types: {
      image: ({ value }: { value: any }) => {
        // Attempt to get original dimensions from metadata. If not present, parse the Sanity
        // asset _ref which encodes WIDTHxHEIGHT, e.g. image-abc123-1000x750-png.
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

        const displayW = 800 // request width from Sanity CDN
        const displayH = Math.round(displayW * origH / origW)
        
        return (
          <div className="mt-6 mb-6">
            <img
              src={urlFor(value).width(displayW).quality(80).url()}
              alt={value.alt || ''}
              className="w-full h-auto block"
              loading="lazy"
              style={{ aspectRatio: `${origW}/${origH}`, margin: 0, padding: 0 }}
            />
            {value.caption && (
              <p className="text-xs italic mt-2 text-light" style={{fontFamily: 'Times Now'}}>{value.caption}</p>
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
          <div className="my-8">
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
  }) as Partial<PortableTextReactComponents>, [scrollToFootnote, scrollToGlossaryTerm, footnotesMap, glossaryMap])

  // Memoise rendered PortableText markup so the component subtree (inc. images)
  // is stable between renders. It depends on the module ID (body) and the
  // portableTextComponents map.
  const portableTextMarkup = useMemo(() => {
    if (currentModule?.body && currentModule.body.length > 0) {
      return (
        <PortableText value={currentModule.body} components={portableTextComponents} />
      )
    }
    return null
  }, [currentModule?._id, portableTextComponents])

  // Section rendering functions
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

  const renderImageGallerySection = (section: SanityImageGallerySection) => (
    <section key={`gallery-${section.title || 'untitled'}`} className="space-y-4">
      
      <div className="space-y-24">
        {section.images?.map((imageItem, index) => {
          // Get dimensions from image asset if available
          let origW: number | undefined
          let origH: number | undefined

          // Handle different possible structures of the image asset
          if (typeof imageItem.image === 'object' && imageItem.image && 'asset' in imageItem.image) {
            const imageAsset = imageItem.image.asset as any
            origW = imageAsset?.metadata?.dimensions?.width
            origH = imageAsset?.metadata?.dimensions?.height

            // If no metadata dimensions, try to parse from asset _ref
            if (!origW || !origH) {
              const ref = imageAsset?._ref
              const match = ref?.match(/-(\d+)x(\d+)-/)
              if (match) {
                origW = parseInt(match[1], 10)
                origH = parseInt(match[2], 10)
              }
            }
          }

          // Use sensible defaults if dimensions can't be determined
          origW = origW || 800
          origH = origH || 600

          return (
            <div key={`image-${index}`} className="space-y-2">
              <img
                src={urlFor(imageItem.image).width(800).quality(80).url()}
                alt={imageItem.alt || imageItem.caption || ''}
                width={origW}
                height={origH}
                className="w-full h-auto"
                loading="lazy"
                style={{ aspectRatio: `${origW}/${origH}` }}
              />
              {imageItem.caption && (
                <p className="text-xs italic text-light" style={{ fontFamily: 'Times Now' }}>
                  {imageItem.caption}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )

  const renderTextBlockSection = (section: SanityTextBlock) => (
    <section key={`text-${Math.random()}`} className="prose-custom">
      <PortableText 
        value={section.content} 
        components={portableTextComponents} 
      />
    </section>
  )


  const renderModuleContent = () => {
    if (modulesState.loading) {
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
      <div className="p-4 pb-24 md:pb-16">
        <div className="max-w-none">
          
          <header className="mb-6">
            <div className="flex items-center text-sm uppercase text-light mb-1">
              <span>
                {currentModule.order === 0
                  ? "Prelude"
                  : `Chapter ${["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][currentModule.order - 1] || currentModule.order}`}
              </span>
              {typeof currentModule.order === "number" && currentModule.order > 0 && currentModule.timeline && (
                <>
                  <div className="w-1 h-1 bg-light rounded-full mx-3"></div>
                  <span>{currentModule.timeline}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-extrabold font-serif text-light mb-2">
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
              <>
                {portableTextMarkup}
                
                {/* Glossary Section */}
                {referencedGlossaryTerms.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-light">
                    <h3 className="text-base text-light font-serif font-extrabold italic">
                      Glossary
                    </h3>
                    <div className="space-y-4">
                      {referencedGlossaryTerms.map((term) => (
                        <div key={term.id} className="text-sm">
                          <div className="text-light leading-normal">
                            <button
                              id={`glossary-${term.id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                scrollToGlossaryReference(term.id)
                              }}
                              className="text-light hover:text-muted transition-colors cursor-pointer font-serif font-bold inline-flex items-baseline hover:underline hover:decoration-dotted hover:underline-offset-2 group"
                              title={`Return to reference for ${term.term}`}
                            >
                              <svg
                                className="w-3 h-3 mr-1 text-light group-hover:text-muted transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                              <span className="transition-all">
                                {term.term}
                              </span>
                            </button>
                            <span className="inline font-serif font-normal ml-2">
                              <PortableText
                                value={term.definition}
                                components={{
                                  block: {
                                    normal: ({children}) => <span className="text-light">{children}</span>,
                                  },
                                  marks: {
                                    strong: ({children}) => <strong className="font-extrabold text-light">{children}</strong>,
                                    em: ({children}) => <em className="italic text-light">{children}</em>,
                                    link: ({children, value}) => (
                                      <a href={value?.href} className="text-light underline hover:text-primary" target="_blank" rel="noopener noreferrer">
                                        {children}
                                      </a>
                                    ),
                                  },
                                }}
                              />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footnotes Section */}
                {referencedFootnotes.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-light">
                    <h3 className="text-base text-light font-serif font-extrabold italic">
                      Footnotes
                    </h3>
                    <div className="space-y-1">
                      {referencedFootnotes.map((footnote) => (
                        <div key={footnote.id} className="text-sm">
                          <p className="text-light leading-normal">
                            <button
                              id={`footnote-${footnote.id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                scrollToReference(footnote.id)
                              }}
                              className="text-light hover:text-muted transition-colors cursor-pointer font-serif font-semibold mr-1"
                              title={`Return to reference ${footnote.number}`}
                            >
                              [{footnote.number}]
                            </button>
                            <span className="inline font-serif font-semibold">
                              <PortableText
                                value={footnote.content}
                                components={{
                                  block: {
                                    normal: ({children}) => <span className="text-light">{children}</span>,
                                  },
                                  marks: {
                                    strong: ({children}) => <strong className="font-extrabold text-light">{children}</strong>,
                                    em: ({children}) => <em className="italic text-light">{children}</em>,
                                    link: ({children, value}) => (
                                      <a href={value?.href} className="text-light underline hover:text-primary" target="_blank" rel="noopener noreferrer">
                                        {children}
                                      </a>
                                    ),
                                  },
                                }}
                              />
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                
              </>
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
    if (contentPagesState.loading) {
      return (
        <div className="p-6">
          <div className="text-center text-muted">
            Loading page content...
          </div>
        </div>
      )
    }

    const currentPageData = pageState.currentPageSlug 
      ? getPageBySlug(pageState.currentPageSlug)
      : null
    
    if (!currentPageData) {
      return (
        <div className="p-6">
          <div className="text-center text-muted">
            <p className="text-sm">Page not found</p>
            <p className="text-xs mt-2">No content available for {pageState.currentPageSlug}</p>
          </div>
        </div>
      )
    }

    // Special handling for stills page with vertical tabs and expandable gallery
    if (currentPageData?.pageType === 'stills' && currentPageData.sections?.length > 0) {
      // Show vertical tabs in collapsed view
      if (galleryViewMode === 'tabs') {
        return (
          <div className="flex flex-col h-full">
            {/* Vertical Tabs - takes full space when in tabs mode */}
            <div className="flex-1 flex flex-col">
              {currentPageData.sections.map((section, index) => {
                const sectionTitle = section.title || `Section ${index + 1}`
                
                return (
                  <button
                    key={`tab-${index}`}
                    onClick={() => {
                      setActiveTabIndex(index)
                      setGalleryViewMode('expanded')
                    }}
                    className="flex items-center px-6 py-10 gap-2 text-left border-b border-light hover:bg-dark/30 transition-all"
                  >
                    {section.icon && (
                      <div className="flex-shrink-0 w-16 h-full mr-4 flex items-center">
                        <Image
                          src={urlFor(section.icon).url()}
                          alt=""
                          width={48}
                          height={48}
                          className="object-contain max-h-full w-auto"
                        />
                      </div>
                    )}
                    <h3 className="text-light font-medium text-xl text-base">{sectionTitle}</h3>
                    
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      // Show expanded gallery content
      if (galleryViewMode === 'expanded' || galleryViewMode === 'maximized') {
        const activeSection = currentPageData.sections[activeTabIndex]
        const sectionTitle = activeSection?.title || `Section ${activeTabIndex + 1}`

        return (
          <div className="flex flex-col h-full">
            {/* Gallery Header with Controls */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center">
                <button
                  onClick={() => setGalleryViewMode('tabs')}
                  className="p-2 hover:bg-dark/50 rounded transition-colors mr-3"
                  aria-label="Back to sections"
                >
                  <svg className="w-4 h-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* <h2 className="text-light font-medium text-lg">{sectionTitle}</h2> */}
              </div>
              
              <button
                onClick={() => {
                  if (galleryViewMode === 'maximized') {
                    setGalleryViewMode('expanded')
                    setPanelMaximized(false)
                  } else {
                    setGalleryViewMode('maximized')
                    setPanelMaximized(true)
                  }
                }}
                className="p-2 hover:bg-dark/50 rounded transition-colors"
                aria-label={galleryViewMode === 'maximized' ? 'Minimize' : 'Maximize'}
              >
                {galleryViewMode === 'maximized' ? (
                  <svg className="w-4 h-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
            </div>

            {/* Gallery Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {activeSection && (() => {
                switch (activeSection._type) {
                  case 'categorySection':
                    return renderCategorySection(activeSection as SanityCategorySection)
                  case 'imageGallerySection':
                    return renderImageGallerySection(activeSection as SanityImageGallerySection)
                  case 'textBlock':
                    return renderTextBlockSection(activeSection as SanityTextBlock)
                  default:
                    return (
                      <div className="text-muted">
                        <p className="text-sm">Unsupported section type: {activeSection._type}</p>
                      </div>
                    )
                }
              })()}
            </div>
          </div>
        )
      }
    }

    // Default rendering for other pages (consulting, installations, about)
    return (
      <div className="p-4 pb-24 md:pb-16">
        <div className="max-w-none">
          


          <div className="space-y-8">
            {currentPageData.sections?.length > 0 ? (
              currentPageData.sections.map((section, index) => {
                switch (section._type) {
                  case 'categorySection':
                    return renderCategorySection(section as SanityCategorySection)
                  case 'imageGallerySection':
                    return renderImageGallerySection(section as SanityImageGallerySection)
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

  // Handle visibility through CSS instead of early returns to maintain consistent hook calls

  // ---- Mobile rendering ---- //
  const translateClass = stage === 'hidden'
    ? 'translate-y-full'
    : stage === 'peek'
      ? 'translate-y-[calc(100%-6rem)]'
      : 'translate-y-0'

  const heightClass = 'h-[70vh]' // keep constant height so grab bar doesn’t jerk

  // ----- Touch swipe handlers for grab bar (mobile) -----
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only consider single-touch gestures
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startY = touchStartYRef.current
    if (startY === null) return

    const endY = e.changedTouches[0].clientY
    const deltaY = endY - startY

    // Threshold to filter out accidental small movements (in pixels)
    const SWIPE_THRESHOLD = 40

    if (deltaY < -SWIPE_THRESHOLD) {
      // Swipe up → attempt to expand panel
      if (stage === 'peek') {
        expandContentPanel()
      }
    } else if (deltaY > SWIPE_THRESHOLD) {
      // Swipe down → attempt to collapse to peek
      if (stage === 'expanded') {
        showPeek()
      }
    }

    // Reset ref for next gesture
    touchStartYRef.current = null
  }

  // Slow down expand/contract animations; keep faster timing when fully hiding
  const durationClass = stage === 'hidden' ? 'duration-300' : 'duration-500'

  // ---- Mobile rendering ---- //
  // Get current page data for content pages
  const currentPageData = pageState.currentPage === 'content' && pageState.currentPageSlug 
    ? getPageBySlug(pageState.currentPageSlug)
    : null

  // Handle clicks outside panel to minimize when maximized (desktop only)
  useEffect(() => {
    if (isMobile) return

    const handleClickOutside = (event: MouseEvent) => {
      if (galleryViewMode === 'maximized' && currentPageData?.pageType === 'stills') {
        setGalleryViewMode('expanded')
        setPanelMaximized(false)
      }
    }

    if (galleryViewMode === 'maximized') {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [galleryViewMode, currentPageData?.pageType, setPanelMaximized, isMobile])

  // Determine panel width based on maximized state
  const panelWidthClass = galleryViewMode === 'maximized' ? 'w-[80vw]' : 'w-96'

  return (
    <>
      {/* Mobile Panel */}
      {isMobile && (
        <div
          className={`fixed bottom-0 left-0 right-0 flex flex-col overflow-hidden transition-transform ease-in-out z-30 ${durationClass} ${translateClass} ${heightClass}`}
          style={{ display: isVisible ? 'flex' : 'none' }}
          onClick={(e) => {
            // Only handle clicks on the panel background, not on interactive elements
            if (e.target === e.currentTarget && stage === 'peek') {
              expandContentPanel()
            }
          }}
        >
          {/* Small grab bar / header */}
          <div
            className="flex absolute top-0 items-center justify-center h-8 w-full cursor-pointer z-50"
            onClick={(e) => {
              e.stopPropagation()
              if (stage === 'expanded') {
                // Collapse to peek
                showPeek()
              } else if (stage === 'peek') {
                // Expand fully
                expandContentPanel()
              }
            }}

            // Swipe support
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-8 h-[0.125rem] bg-light rounded-full"></div>
          </div>

          {/* Content area – make wrapper scrollable so content can scroll on mobile */}
          <div
            ref={scrollContainerRef}
            className={`content-scroll flex-1 bg-dark custom-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${stage === 'peek' ? 'overflow-hidden' : 'overflow-y-auto'}`}

            // Intercept any interaction while in peek stage to expand the panel
            onClick={(e) => {
              e.stopPropagation()
              if (stage === 'peek') {
                expandContentPanel()
              }
            }}

            onWheel={(e) => {
              if (stage === 'peek') {
                e.preventDefault()
                expandContentPanel()
              }
            }}

            onTouchMove={(e) => {
              if (stage === 'peek') {
                expandContentPanel()
              }
            }}
          >
            <div
              className={`pt-4 ${
                isHidden
                  ? 'opacity-0 pointer-events-none transition-none'
                  : shouldFadeIn
                    ? 'opacity-100 animate-content-fade-in'
                    : 'opacity-100'
              }`}
            >
              {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Panel */}
      {!isMobile && (
        <div 
          className={`absolute top-0 right-0 h-full z-30 ${panelWidthClass} border-l border-light bg-dark flex flex-col overflow-hidden transition-all duration-300 ${
            isAnimatingOut ? 'animate-slide-out-right' : 'animate-slide-in-right'
          }`}
          style={{ display: isVisible ? 'flex' : 'none' }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside panel from triggering minimize
        >
        {/* Panel header with close button */}
        <div className="flex items-center justify-between p-1 border-b border-light bg-dark/30">
          <div></div>
          <button
            onClick={toggleContentPanel}
            className="p-1 hover:bg-dark rounded transition-colors"
            aria-label="Collapse content panel"
          >
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Panel content */}
        <div className="content-scroll flex-1 overflow-y-auto custom-scrollbar animate-content-fade-in">
          {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
        </div>
        </div>
      )}
    </>
  )
}