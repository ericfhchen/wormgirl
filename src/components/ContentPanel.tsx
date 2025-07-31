'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { PortableText } from '@portabletext/react'
import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { urlFor } from '@/lib/sanity'
import { useFootnotes } from '@/lib/hooks/useFootnotes'
import { useGlossary } from '@/lib/hooks/useGlossary'
import useIsMobile from '@/lib/hooks/useIsMobile'
import Image from 'next/image'

export default function ContentPanel() {
  const { state: pageState, toggleContentPanel, isContentPanelExpanded, expandContentPanel, showPeek } = usePageState()
  const isMobile = useIsMobile()
  const { state: videoState } = useVideo()
  const { state: modulesState, getModule } = useModules()
  
  // Current panel stage
  const stage = pageState.contentPanelStage

  // Track contentKey to detect module changes for fade logic
  const [contentKey, setContentKey] = useState(0)

  // Handle instant hide + delayed fade-in when module content changes
  const [isHidden, setIsHidden] = useState(false)
  const [shouldFadeIn, setShouldFadeIn] = useState(false)

  const prevContentKeyRef = useRef(contentKey)
  const prevStageRef = useRef(stage)

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
  // useEffect(() => {
  //   setContentKey(prev => prev + 1)
  // }, [selectedModuleIndex, pageState.currentPage])

  // Get current module from centralized context
  const rawModule = getModule(selectedModuleIndex)

  const currentModule = useMemo(() => rawModule, [rawModule?._id])

  // Memoize footnotes to prevent new array creation on every render
  const footnotes = useMemo(() => {
    return currentModule?.footnotes || []
  }, [currentModule?.footnotes])

  // Memoize glossary terms to prevent new array creation on every render
  const glossaryTerms = useMemo(() => {
    return currentModule?.glossary || []
  }, [currentModule?.glossary])

  // Initialize footnotes hook at top level
  const {
    registerFootnoteRef,
    getReferencedFootnotes,
    scrollToFootnote,
    scrollToReference,
    footnotesMap
  } = useFootnotes(footnotes)

  // Initialize glossary hook at top level
  const {
    registerGlossaryRef,
    getReferencedGlossaryTerms,
    scrollToGlossaryTerm,
    scrollToGlossaryReference,
    glossaryMap
  } = useGlossary(glossaryTerms)

  // Memoize referenced terms to prevent unnecessary re-renders
  const referencedGlossaryTerms = useMemo(() => {
    return getReferencedGlossaryTerms()
  }, [getReferencedGlossaryTerms])

  const referencedFootnotes = useMemo(() => {
    return getReferencedFootnotes()
  }, [getReferencedFootnotes])

  // Memoize the PortableText components to prevent recreation on every render
  const portableTextComponents = useMemo(() => ({
    block: {
      normal: ({children}) => <p className="leading-normal mb-4 text-light">{children}</p>,
      h1: ({children}) => <h1 className="text-lg font-bold mb-3 text-light">{children}</h1>,
      h2: ({children}) => <h2 className="text-base font-semibold mb-2 text-light">{children}</h2>,
      h3: ({children}) => <h3 className="text-sm font-semibold mb-2 text-light">{children}</h3>,
      intro: ({children}) => <blockquote className="border-l-0 border-light pl-12 font-serif font-semibold italic my-10 text-light text-lg leading-0.5">{children}</blockquote>,
      blockquote: ({children}) => <blockquote className="border-l-0 border-light pl-4 font-serif font-semibold italic my-10 text-light text-lg leading-0.5">{children}</blockquote>,
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
      footnoteRef: ({value}) => {
        // Get footnote number directly from map without calling registration function
        const footnoteNumber = footnotesMap.get(value.footnoteId)?.number || '?'
        return (
          <button
            id={`footnote-ref-${value.footnoteId}`}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToFootnote(value.footnoteId)
            }}
            className="inline-block text-light hover:text-muted transition-colors cursor-pointer text-xs align-super font-medium"
            title={`Go to footnote ${footnoteNumber}`}
          >
            [{footnoteNumber}]
          </button>
        )
      },
      glossaryRef: ({value}) => {
        // Get glossary term directly from map without calling registration function
        const glossaryTerm = glossaryMap.get(value.glossaryId)?.term || '?'
        return (
          <button
            id={`glossary-ref-${value.glossaryId}`}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              scrollToGlossaryTerm(value.glossaryId)
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
      image: ({ value }) => {
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
          <div className="my-4">
            <img
              src={urlFor(value).width(displayW).quality(80).url()}
              alt={value.alt || ''}
              width={origW}
              height={origH}
              className="w-full h-auto rounded-lg"
              loading="lazy"
              style={{ aspectRatio: `${origW}/${origH}` }}
            />
            {value.caption && (
              <p className="text-xs text-muted mt-2 text-center">{value.caption}</p>
            )}
          </div>
        )
      },
    },
  }), [scrollToFootnote, scrollToGlossaryTerm, footnotesMap, glossaryMap])

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

  // Register footnotes and glossary references after render
  useEffect(() => {
    if (currentModule?.body) {
      // Find all footnote and glossary references in the content
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
    }
  }, [currentModule?.body]) // Remove registration functions from dependencies

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
      <div className="p-4">
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

  if (!isVisible) {
    return null
  }

  // ---- Mobile rendering ---- //
  const translateClass = stage === 'hidden'
    ? 'translate-y-full'
    : stage === 'peek'
      ? 'translate-y-[calc(100%-6rem)]'
      : 'translate-y-0'

  const heightClass = 'h-[70vh]' // keep constant height so grab bar doesn’t jerk

  // Slow down expand/contract animations; keep faster timing when fully hiding
  const durationClass = stage === 'hidden' ? 'duration-300' : 'duration-500'

  if (isMobile) {
    return (
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 border-t border-light flex flex-col overflow-hidden transition-transform ease-in-out ${durationClass} ${translateClass} ${heightClass}`}
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
        >
          <div className="w-8 h-[0.125rem] bg-light rounded-full"></div>
        </div>

        {/* Content area – make wrapper scrollable so content can scroll on mobile */}
        <div
          className="flex-1 bg-dark overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          onClick={(e) => {
            // Prevent clicks on content from bubbling up to panel
            e.stopPropagation()
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
    )
  }

  // ---- Desktop rendering ---- //

  return (
    <div className={`w-96 border-l border-light bg-dark flex flex-col overflow-hidden h-full ${
      isAnimatingOut ? 'animate-slide-out-right' : 'animate-slide-in-right'
    }`}>
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
      <div className="flex-1 overflow-y-auto custom-scrollbar animate-content-fade-in">
        {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
      </div>
    </div>
  )
}