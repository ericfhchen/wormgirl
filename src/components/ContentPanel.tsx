'use client'

import { useState, useEffect, useMemo } from 'react'
import { PortableText } from '@portabletext/react'
import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'
import { useModules } from '@/context/ModulesContext'
import { urlFor } from '@/lib/sanity'
import { useFootnotes } from '@/lib/hooks/useFootnotes'
import { useGlossary } from '@/lib/hooks/useGlossary'

export default function ContentPanel() {
  const { state: pageState, toggleContentPanel } = usePageState()
  const { state: videoState } = useVideo()
  const { state: modulesState, getModule } = useModules()
  
  // State to handle closing animation
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [contentKey, setContentKey] = useState(0)

  // Handle panel visibility and animation states
  useEffect(() => {
    if (pageState.isContentPanelExpanded) {
      setIsVisible(true)
      setIsAnimatingOut(false)
    } else if (isVisible) {
      // Start closing animation
      setIsAnimatingOut(true)
      // Hide after animation completes
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setIsAnimatingOut(false)
      }, 400) // Match animation duration
      
      return () => clearTimeout(timeout)
    }
  }, [pageState.isContentPanelExpanded, isVisible])

  // Determine which module index should drive the UI: if a user has selected a new
  // module (stored on pageState.previousModuleIndex) use that immediately,
  // otherwise fall back to the currently playing video index.
  const selectedModuleIndex = pageState.previousModuleIndex !== null
    ? pageState.previousModuleIndex
    : videoState.currentModuleIndex

  // Reset content animation when module changes
  useEffect(() => {
    if (pageState.isContentPanelExpanded) {
      setContentKey(prev => prev + 1)
    }
  }, [selectedModuleIndex, pageState.currentPage, pageState.isContentPanelExpanded])

  // Get current module from centralized context
  const currentModule = getModule(selectedModuleIndex)

  // Memoize footnotes to prevent new array creation on every render
  const footnotes = useMemo(() => {
    return currentModule?.footnotes || []
  }, [currentModule?.footnotes])

  // Memoize glossary terms to prevent new array creation on every render
  const glossaryTerms = useMemo(() => {
    console.log('Glossary terms from Sanity:', currentModule?.glossary) // Debug log
    return currentModule?.glossary || []
  }, [currentModule?.glossary])

  // Initialize footnotes hook at top level
  const {
    registerFootnoteRef,
    getReferencedFootnotes,
    scrollToFootnote,
    scrollToReference
  } = useFootnotes(footnotes)

  // Initialize glossary hook at top level
  const {
    registerGlossaryRef,
    getReferencedGlossaryTerms,
    scrollToGlossaryTerm,
    scrollToGlossaryReference
  } = useGlossary(glossaryTerms)

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
                <PortableText  
                  value={currentModule.body}
                  components={{
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
                        const footnoteNumber = registerFootnoteRef(value.footnoteId)
                        return (
                          <button
                            id={`footnote-ref-${value.footnoteId}`}
                            onClick={() => scrollToFootnote(value.footnoteId)}
                            className="inline-block text-light hover:text-muted transition-colors cursor-pointer text-xs align-super font-medium"
                            title={`Go to footnote ${footnoteNumber}`}
                          >
                            [{footnoteNumber}]
                          </button>
                        )
                      },
                      glossaryRef: ({value}) => {
                        console.log('Processing glossary reference:', value) // Debug log
                        const glossaryTerm = registerGlossaryRef(value.glossaryId)
                        return (
                          <button
                            id={`glossary-ref-${value.glossaryId}`}
                            onClick={() => scrollToGlossaryTerm(value.glossaryId)}
                            className="glossary-term text-light hover:text-muted transition-colors cursor-pointer font-medium"
                            title={`Go to glossary term: ${glossaryTerm}`}
                          >
                            {glossaryTerm}
                          </button>
                        )
                      },
                    },
                    types: {
                      image: ({value}) => (
                        <div className="my-4">
                          <img 
                            src={urlFor(value).width(800).quality(80).url()} 
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
                
                {/* Glossary Section */}
                  {(() => {
                    const referencedTerms = getReferencedGlossaryTerms()
                    console.log('Referenced glossary terms:', referencedTerms) // Debug log
                    return referencedTerms.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-light">
                        <h3 className="text-base text-light font-serif font-extrabold italic">
                          Glossary
                        </h3>
                        <div className="space-y-4">
                          {referencedTerms.map((term) => (
                            <div key={term.id} className="text-sm">
                              <div className="text-light leading-normal">
                                <button
                                  id={`glossary-${term.id}`}
                                  onClick={() => scrollToGlossaryReference(term.id)}
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
                    )
                  })()}

                {/* Footnotes Section */}
                {getReferencedFootnotes().length > 0 && (
                  <div className="mt-8 pt-6 border-t border-light">
                    <h3 className="text-base text-light font-serif font-extrabold italic">
                      Footnotes
                    </h3>
                    <div className="space-y-1">
                      {getReferencedFootnotes().map((footnote) => (
                        <div key={footnote.id} className="text-sm">
                          <p className="text-light leading-normal">
                            <button
                              id={`footnote-${footnote.id}`}
                              onClick={() => scrollToReference(footnote.id)}
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

  return (
    <div className={`w-96 border-l border-light bg-dark flex flex-col overflow-hidden h-full ${
      isAnimatingOut ? 'animate-slide-out-right' : 'animate-slide-in-right'
    }`}>
      {/* Panel header with close button */}
      <div className="flex items-center justify-between p-1 border-b border-light bg-dark/30">
        {/* <h2 className="font-semibold text-light text-sm">
          {pageState.currentPage === 'module' ? 'Module Content' : 'Page Content'}
        </h2> */}
        <div></div>
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

      {/* Panel content with delayed fade-in */}
      <div 
        key={contentKey}
        className="flex-1 overflow-y-auto custom-scrollbar animate-content-fade-in"
      >
        {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
      </div>
    </div>
  )
} 