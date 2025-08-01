'use client'

import { useModules } from '@/context/ModulesContext'
import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'
import React, { useRef, useLayoutEffect } from 'react'

// Helper function to convert number to Roman numeral
function toRomanNumeral(num: number): string {
  const romanNumerals = [
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 1, numeral: 'I' },
  ]

  let result = ''
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral
      num -= value
    }
  }
  return result
}

export default function MobileModuleBar() {
  const containerRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const { state: modulesState } = useModules()
  const { playModule } = useVideo()
  const {
    state: pageState,
    closeTopMenu,
    setModulePage,
  } = usePageState()

  const handleModuleClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    index: number,
    slug: string
  ) => {
    // If top menu open, close it first
    if (pageState.isTopMenuOpen) {
      closeTopMenu()
    }
    playModule(index)
    setModulePage(index, slug)
    // Panel will already be in peek via setModulePage

    // Snap selected tile to the left edge
    if (containerRef.current) {
      const button = e.currentTarget as HTMLButtonElement
      const container = containerRef.current
      container.scrollTo({ left: button.offsetLeft, behavior: 'smooth' })
    }
  }

  // Determine offset: when the content panel is peeking, move the bar up by the same amount (4rem).
  // When the panel is fully expanded we hide the bar off-screen so it doesn’t cover the panel.
  const barOffsetClass = (() => {
    // Slide only on module pages when top menu is not open
    if (pageState.isTopMenuOpen || pageState.currentPage !== 'module') return ''

    if (pageState.contentPanelStage === 'expanded') return '-translate-y-[70vh]' // Above expanded panel
    if (pageState.contentPanelStage === 'peek') return '-translate-y-24' // Align with peek
    return ''
  })()

  // Dim and disable only when the top menu itself is open
  const disabledStyle = pageState.isTopMenuOpen
    ? 'pointer-events-none opacity-40'
    : ''

  // Match bar animation timing with content panel (slower when panel visible)
  const barDurationClass = pageState.contentPanelStage === 'hidden' ? 'duration-300' : 'duration-500'

  // Update CSS custom properties that expose the bar's height and its current
  // offset from the bottom of the viewport so other components (like the
  // Next Chapter button) can position themselves reliably.
  useLayoutEffect(() => {
    const updateMetrics = () => {
      const el = barRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()

      // Height rarely changes but keep it for completeness
      document.documentElement.style.setProperty('--mobile-module-bar-height', `${rect.height}px`)

      // Distance from viewport bottom to the bar *bottom* (i.e. including any
      // translate-Y applied via Tailwind classes).
      // Use layout viewport height so browser chrome doesnʼt shift the calculation
      const viewportHeight = window.innerHeight
      const offsetFromBottom = viewportHeight - rect.top
      document.documentElement.style.setProperty('--mobile-module-bar-offset', `${offsetFromBottom}px`)
    }

    updateMetrics()

          // Schedule extra measurements after initial load
          setTimeout(updateMetrics, 0)
          requestAnimationFrame(() => requestAnimationFrame(updateMetrics))
          setTimeout(updateMetrics, 300)

          window.addEventListener('resize', updateMetrics)
      window.addEventListener('orientationchange', updateMetrics)
      // Safari iOS hides/shows its browser chrome when scrolling which changes the viewport height
      window.addEventListener('scroll', updateMetrics)

    // Update again when the bar's slide animation completes so the offset reflects
    // the final position (initial measurement can be early while the transition is in progress).
    const el = barRef.current
    const handleTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'transform') {
        updateMetrics()
      }
    }

    if (el) {
      el.addEventListener('transitionend', handleTransitionEnd)
    }

    return () => {
      window.removeEventListener('resize', updateMetrics)
      window.removeEventListener('orientationchange', updateMetrics)
      window.removeEventListener('scroll', updateMetrics)

      if (el) {
        el.removeEventListener('transitionend', handleTransitionEnd)
      }
    }
  }, [pageState.contentPanelStage, pageState.isTopMenuOpen])

  return modulesState.loading ? null : (
    <div
      ref={barRef}
      id="mobile-module-bar"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform ease-in-out ${barDurationClass} bg-dark ${barOffsetClass}`}
      onClick={() => {
        if (pageState.isTopMenuOpen) {
          closeTopMenu()
        }
      }}
    >
      <div
        ref={containerRef}
        className={`flex overflow-x-auto overscroll-x-contain snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${disabledStyle}`}
      >
        {modulesState.modules.map((module, index) => {
          const isActive =
            pageState.currentPage === 'module' &&
            pageState.previousModuleIndex === index
          const isFirst = index === 0
          const isLast = index === modulesState.modules.length - 1

          // Border logic: only top, bottom, and left borders; remove left on first, right on last
          const borderClasses = `${isFirst ? 'border-l-0' : 'border-l'} ${
            isLast ? 'border-r-0' : ''
          } border-y border-light`

          return (
            <button
              key={module._id}
              onClick={(e) => handleModuleClick(e, index, module.slug.current)}
              className={`group flex-shrink-0 w-44 snap-start text-left p-0 transition-colors ${
                isActive ? 'bg-light text-dark' : 'hover:bg-light hover:text-primary'
              } ${borderClasses}`}
            >
              <div className="flex flex-col h-full p-3 pb-8 justify-start">
                <div
                  className={`w-6 h-6 mb-1 text-lg font-serif font-bold ${
                    isActive ? 'text-dark' : 'text-light group-hover:text-dark'
                  }`}
                >
                  {index === 0 ? 'PRELUDE' : toRomanNumeral(module.order)}
                </div>
                <div>
                  <p className="font-medium text-xs">{module.title}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}