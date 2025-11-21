'use client'

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { PortableText, type PortableTextReactComponents } from '@portabletext/react'
import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { useContentPages } from '@/context/ContentPagesContext'
import { urlFor, type SanityAboutPage, type SanityLibraryPage, type SanityWorksPage } from '@/lib/sanity'
import { useFootnotes } from '@/lib/hooks/useFootnotes'
import { useGlossary } from '@/lib/hooks/useGlossary'
import useIsMobile from '@/lib/hooks/useIsMobile'
import Image from 'next/image'
import ImageCarousel from './ImageCarousel'
import TruncatedDescription from './TruncatedDescription'
import aboutPage from '@/schemas/aboutPage'

export default function ContentPanel() {
  const { state: pageState, toggleContentPanel, isContentPanelExpanded, expandContentPanel, showPeek, setPanelMaximized } = usePageState()
  const isMobile = useIsMobile()
  const { state: videoState } = useVideo()
  const { state: modulesState, getModule } = useModules()
  const { state: contentPagesState, getPageBySlug } = useContentPages()
  
  // Current panel stage
  const stage = pageState.contentPanelStage

  // Track contentKey to detect module changes for fade logic
  const [contentKey, setContentKey] = useState(0)

  // Handle instant hide + delayed fade-in when module content changes
  const [isHidden, setIsHidden] = useState(false)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)

  // State for panel width expansion (desktop)
  const [isPanelExpanded, setIsPanelExpanded] = useState(false)

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
      // Reset all expand states when closing
      setPanelMaximized(false)
      setIsPanelExpanded(false)
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
    footnotesMap,
    highlightedFootnoteId
  } = useFootnotes(footnotes, isMobile)

  const {
    registerGlossaryRef,
    getReferencedGlossaryTerms,
    scrollToGlossaryTerm,
    scrollToGlossaryReference,
    glossaryMap,
    highlightedGlossaryId
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
      h3: ({children}: any) => <h3 className="text-md mb-1 font-sc mb-0 text-light">{children}</h3>,
      blockquote: ({children}: any) => <blockquote className="font-mono text-sm text-light my-10 border-l-0 pl-12">{children}</blockquote>,
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
      footnoteRef: ({value}: {value?: {footnoteId: string}}) => {
        // Get footnote number directly from map without calling registration function
        const footnoteNumber = footnotesMap.get(value!.footnoteId)?.number || '?'
        const isHighlighted = highlightedFootnoteId === value!.footnoteId
        
        return (
          <button
            id={`footnote-ref-${value!.footnoteId}`}
            data-footnote-id={value!.footnoteId}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToFootnote(value!.footnoteId)
            }}
            className={`inline-block ${isHighlighted ? 'glossary-highlight-active' : 'text-light hover:text-muted transition-colors'} cursor-pointer text-xs align-super font-medium`}
            title={`Go to footnote ${footnoteNumber}`}
          >
            [{footnoteNumber}]
          </button>
        )
      },
      glossaryRef: ({children, value}: {children: ReactNode, value?: {glossaryId: string}}) => {
        // Get glossary term directly from map for tooltip only
        const glossaryTerm = glossaryMap.get(value!.glossaryId)?.term || '?'
        const isHighlighted = highlightedGlossaryId === value!.glossaryId
        
        return (
          <button
            id={`glossary-ref-${value!.glossaryId}`}
            data-glossary-id={value!.glossaryId}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToGlossaryTerm(value!.glossaryId)
            }}
            className={`glossary-term ${isHighlighted ? 'glossary-highlight-active' : 'text-light hover:text-muted transition-colors'} cursor-pointer font-bold`}
            title={`Go to glossary term: ${glossaryTerm}`}
          >
            {children}
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
          <div className={`mt-10 mb-16 ${isPanelExpanded ? 'max-w-[460px]' : ''}`}>
            <img
              src={urlFor(value).width(displayW).quality(80).url()}
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
  }) as Partial<PortableTextReactComponents>, [scrollToFootnote, scrollToGlossaryTerm, footnotesMap, glossaryMap, highlightedGlossaryId, highlightedFootnoteId])

  // Separate components for content pages with tighter spacing and smaller text
  const contentPageTextComponents = useMemo(() => ({
    block: {
      normal: ({children}: any) => <p className="text-sm leading-snug mb-4 text-light">{children}</p>,
      h1: ({children}: any) => <h1 className="text-sm font-bold mb-2 text-light">{children}</h1>,
      h2: ({children}: any) => <h2 className="text-sm font-semibold mb-1 text-light">{children}</h2>,
      h3: ({children}: any) => <h3 className="text-sm mb-1 font-sc mb-0 text-light">{children}</h3>,
      blockquote: ({children}: any) => <blockquote className="font-mono text-xs text-light my-4 border-l-0 pl-6">{children}</blockquote>,
    },
    list: {
      bullet: ({children}: any) => <ul className="text-xs space-y-0 mb-2 custom-bullet-list text-light">{children}</ul>,
      number: ({children}: any) => <ol className="text-xs space-y-0 mb-2 list-decimal list-inside text-light">{children}</ol>,
    },
    listItem: {
      bullet: ({children}: any) => <li className="text-light leading-tight">{children}</li>,
      number: ({children}: any) => <li className="text-light leading-tight">{children}</li>,
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
      footnoteRef: ({value}: {value?: {footnoteId: string}}) => {
        const footnoteNumber = footnotesMap.get(value!.footnoteId)?.number || '?'
        const isHighlighted = highlightedFootnoteId === value!.footnoteId
        return (
          <button
            id={`footnote-ref-${value!.footnoteId}`}
            data-footnote-id={value!.footnoteId}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToFootnote(value!.footnoteId)
            }}
            className={`inline-block ${isHighlighted ? 'glossary-highlight-active' : 'text-light hover:text-muted transition-colors'} cursor-pointer text-xs align-super font-medium`}
            title={`Go to footnote ${footnoteNumber}`}
          >
            [{footnoteNumber}]
          </button>
        )
      },
      glossaryRef: ({children, value}: {children: ReactNode, value?: {glossaryId: string}}) => {
        const glossaryTerm = glossaryMap.get(value!.glossaryId)?.term || '?'
        const isHighlighted = highlightedGlossaryId === value!.glossaryId
        return (
          <button
            id={`glossary-ref-${value!.glossaryId}`}
            data-glossary-id={value!.glossaryId}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToGlossaryTerm(value!.glossaryId)
            }}
            className={`glossary-term ${isHighlighted ? 'glossary-highlight-active' : 'text-light hover:text-muted transition-colors'} cursor-pointer font-bold`}
            title={`Go to glossary term: ${glossaryTerm}`}
          >
            {children}
          </button>
        )
      },
    },
    types: {
      image: ({ value }: { value: any }) => {
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
        origW = origW || 800
        origH = origH || 600
        const displayW = 800
        const displayH = Math.round(displayW * origH / origW)
        
        return (
          <div className={`mt-4 mb-6 ${isPanelExpanded ? 'max-w-[460px]' : ''}`}>
            <img
              src={urlFor(value).width(displayW).quality(80).url()}
              alt={value.alt || ''}
              className="w-full h-auto block"
              loading="lazy"
              style={{ aspectRatio: `${origW}/${origH}`, margin: 0, padding: 0 }}
            />
            {value.caption && (
              <p className="text-xs italic mt-1 text-light" style={{fontFamily: 'Baskervville'}}>{value.caption}</p>
            )}
          </div>
        )
      },
      spotifyEmbed: ({ value }: { value: { url: string; height?: number } }) => {
        if (!value?.url) return null
        const embedUrl = value.url.replace('open.spotify.com/', 'open.spotify.com/embed/')
        const height = value.height || 380
        return (
          <div className="my-4">
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
  }) as Partial<PortableTextReactComponents>, [scrollToFootnote, scrollToGlossaryTerm, footnotesMap, glossaryMap, highlightedGlossaryId, highlightedFootnoteId])

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
            <h1 className="text-3xl font-bold font-serif italic text-light mb-2">
              {currentModule.articleHeading}
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
                      {referencedGlossaryTerms.map((term) => {
                        const isHighlighted = highlightedGlossaryId === term.id
                        
                        return (
                        <div key={term.id} className="text-sm">
                          <div className={`text-light leading-normal ${isHighlighted ? 'glossary-highlight-active' : ''}`}>
                            <button
                              id={`glossary-${term.id}`}
                              data-glossary-id={term.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                scrollToGlossaryReference(term.id)
                              }}
                              className="cursor-pointer font-serif font-bold inline-flex items-baseline hover:underline hover:decoration-dotted hover:underline-offset-2 group text-light hover:text-muted transition-colors"
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
                              <span>
                                {term.term}
                              </span>
                            </button>
                            <span className="inline font-serif font-normal"> : </span>
                            <span className="inline font-serif font-normal">
                              <PortableText
                                value={term.definition}
                                components={{
                                  block: {
                                    normal: ({children}) => <span className="text-light">{children}</span>,
                                  },
                                  marks: {
                                    strong: ({children}) => <strong className="font-extrabold text-light">{children}</strong>,
                                    em: ({children}) => <em className="italic text-light">{children}</em>,
                                    smallCaps: ({children}) => <span className="font-sc text-light">{children}</span>,
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
                        )
                      })}
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
                      {referencedFootnotes.map((footnote) => {
                        const isHighlighted = highlightedFootnoteId === footnote.id
                        
                        return (
                        <div key={footnote.id} className="text-sm">
                          <p className={`text-light leading-normal ${isHighlighted ? 'glossary-highlight-active' : ''}`}>
                            <button
                              id={`footnote-${footnote.id}`}
                              data-footnote-id={footnote.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                scrollToReference(footnote.id)
                              }}
                              className="cursor-pointer font-serif font-semibold mr-1 inline-flex items-baseline hover:underline hover:decoration-dotted hover:underline-offset-2 group text-light hover:text-muted transition-colors"
                              title={`Return to reference ${footnote.number}`}
                            >
                              <svg
                                className="w-3 h-3 mr-1 text-light group-hover:text-muted transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                              </svg>
                              <span>
                                [{footnote.number}]
                              </span>
                            </button>
                            <span className="inline font-serif font-normal">
                              <PortableText
                                value={footnote.content}
                                components={{
                                  block: {
                                    normal: ({children}) => <span className="text-light">{children}</span>,
                                  },
                                  marks: {
                                    strong: ({children}) => <strong className="font-extrabold text-light">{children}</strong>,
                                    em: ({children}) => <em className="italic text-light">{children}</em>,
                                    smallCaps: ({children}) => <span className="font-sc text-light">{children}</span>,
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
                        )
                      })}
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

    // Render based on page type
    switch (currentPageData._type) {
      case 'aboutPage':
        return (
          <div className="p-4 pb-24 md:pb-16">
            <h1 className="text-3xl font-bold font-serif italic text-light pb-8">
              {currentPageData.title}
            </h1>
            <div className="max-w-none">
              <div className="prose-custom">
                {(currentPageData as SanityAboutPage).content && (
                  <PortableText 
                    value={(currentPageData as SanityAboutPage).content} 
                    components={contentPageTextComponents} 
                  />
                )}
              </div>
            </div>
          </div>
        )

      case 'libraryPage': {
        const libraryPage = currentPageData as SanityLibraryPage
        
        // Helper function to render a numbered list of links
        const renderLinkList = (items: Array<{ title: string; url: string; description?: string }>, startIndex: number = 0) => {
          if (!items || items.length === 0) return null
          
          return (
            <div className="w-full">
              <ul className="w-full">
                {items.map((item, index) => {
                  const counter = String(startIndex + index + 1).padStart(3, '0')
                  return (
                    <li 
                      key={index} 
                      className="w-full border-t border-light py-3 last:border-b"
                    >
                      <div className="flex items-center">
                        <span className="text-sm text-light font-mono">{counter}</span>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-light hover:text-muted transition-colors ml-4"
                        >
                          {item.title}
                        </a>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        }
        
        return (
          <div className="p-4 pb-24 md:pb-16">
            <h1 className="text-3xl font-bold font-serif italic text-light pb-8">
              {libraryPage.title}
            </h1>
            <div className="max-w-none">
              {libraryPage.description && (
                <div className="prose-custom mb-16">
                  <PortableText 
                    value={libraryPage.description} 
                    components={contentPageTextComponents} 
                  />
                </div>
              )}
              {libraryPage.sound && libraryPage.sound.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-lg font-semibold mb-4 text-light">Sound</h2>
                  {renderLinkList(libraryPage.sound)}
                </div>
              )}
              {libraryPage.books && libraryPage.books.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-lg font-semibold mb-4 text-light">Books</h2>
                  {renderLinkList(libraryPage.books)}
                </div>
              )}
            </div>
          </div>
        )
      }

      case 'worksPage': {
        const worksPage = currentPageData as SanityWorksPage
        return (
          <div className="p-4 pb-24 md:pb-16">
            <h1 className="text-3xl font-bold font-serif italic text-light pb-8">
              {worksPage.title}
            </h1>
            <div 
              className="max-w-none"
              style={{
                // Ensure stable width regardless of scrollbar
                width: '100%',
                boxSizing: 'border-box',
                // Prevent width recalculation
                minWidth: 0,
                maxWidth: '100%'
              }}
            >
              {worksPage.projects && worksPage.projects.length > 0 ? (
                <div className="space-y-8">
                  {worksPage.projects.map((project: any) => (
                    <div 
                      key={project._id} 
                      className="border-b border-light pb-8 last:border-0"
                      style={{
                        // Ensure project container maintains stable width
                        width: '100%',
                        boxSizing: 'border-box',
                        // Prevent layout shifts
                        contain: 'layout',
                        // Maintain stable positioning
                        position: 'relative'
                      }}
                    > 
                      {project.projectDetails && (
                        <div className="prose-custom mb-4">
                          <PortableText 
                            value={project.projectDetails} 
                            components={contentPageTextComponents} 
                          />
                        </div>
                      )}
                      {project.imageCarousel && project.imageCarousel.length > 0 && (
                        <div className="mb-4">
                          <ImageCarousel 
                            images={project.imageCarousel} 
                            projectTitle={project.title}
                          />
                        </div>
                      )}
                      {project.projectDescription && (
                        <div 
                          style={{ 
                            // Use flex to maintain stable positioning
                            display: 'flex',
                            flexDirection: 'column',
                            // Prevent layout shifts
                            contain: 'layout style',
                            // Maintain stable position
                            position: 'relative',
                            width: '100%'
                          }}
                        >
                          <TruncatedDescription 
                            value={project.projectDescription} 
                            components={contentPageTextComponents} 
                          />
                        </div>
                      )}
                      {project.projectLinks && project.projectLinks.length > 0 && (
                        <div className="mt-4">
                          <ul className="space-y-2">
                            {project.projectLinks.map((link: { label: string; url: string }, index: number) => (
                              <li key={index}>
                                <a 
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm no-underline hover:underline transition-all"
                                >
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted">
                  <p className="text-sm">No projects available</p>
                  <p className="text-xs mt-2">Add projects to this page in the Sanity Studio</p>
                </div>
              )}
            </div>
          </div>
        )
      }

      default:
        return (
          <div className="p-6">
            <div className="text-center text-muted">
              <p className="text-sm">Unsupported page type: {(currentPageData as any)._type}</p>
            </div>
          </div>
        )
    }
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

  // Determine panel width based on expansion
  const panelWidthClass = isPanelExpanded ? 'w-[584px]' : 'w-96'

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
        {/* Panel header with expand and close buttons */}
        <button
          onClick={() => setIsPanelExpanded(!isPanelExpanded)}
          className="absolute z-20 top-0 left-0 p-1 hover:bg-dark rounded transition-colors"
          aria-label={isPanelExpanded ? "Contract panel" : "Expand panel"}
        >
          {isPanelExpanded ? (
            // Minus symbol
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          ) : (
            // Plus symbol
            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
            </svg>
          )}
        </button>
        
        <button
          onClick={toggleContentPanel}
          className="absolute z-20 top-0 right-0 p-1 hover:bg-dark rounded transition-colors"
          aria-label="Close content panel"
        >
          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Panel content */}
        <div 
          className="content-scroll flex-1 custom-scrollbar animate-content-fade-in"
          style={{ 
            scrollbarGutter: 'stable',
            // Always reserve scrollbar space by using scroll instead of auto
            overflowY: 'scroll',
            // Ensure stable width
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
        </div>
        </div>
      )}
    </>
  )
}