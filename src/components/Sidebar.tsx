'use client'

import { useState, useEffect } from 'react'
import { useVideo } from '@/context/VideoContext'
import { usePageState } from '@/context/PageStateContext'
import { useModules } from '@/context/ModulesContext'

// Helper function to convert number to Roman numeral
function toRomanNumeral(num: number): string {
  const romanNumerals = [
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 1, numeral: 'I' }
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

export default function Sidebar() {
  const { state: videoState, playModule } = useVideo()
  const { state: pageState, setCurrentPage, setModulePage, expandContentPanel } = usePageState()
  const { state: modulesState } = useModules()

  const contentPages = [
    { slug: 'consulting', title: 'Consulting', pageType: 'consulting' as const },
    { slug: 'stills', title: 'Stills', pageType: 'stills' as const },
    { slug: 'installations', title: 'Installations', pageType: 'installations' as const },
    { slug: 'about', title: 'About', pageType: 'about' as const },
  ]

  const handleModuleClick = (index: number, slug: string) => {
    console.log('🎯 Sidebar: Module clicked', { index, slug })
    playModule(index)
    setModulePage(index, slug)
  }

  const handleContentPageClick = (pageType: string, slug: string) => {
    setCurrentPage(pageType as any, slug)
  }

  return (
    <div className="h-full flex flex-col bg-dark">

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto min-h-0 flex-1 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Educational Modules */}
        <div className="p-0 flex-1">
          <div className="space-y-0">
            {modulesState.loading ? (
              <div className="p-3 text-center text-muted text-sm">
                Loading modules...
              </div>
            ) : modulesState.modules.length === 0 ? (
              <div className="p-3 text-center text-muted text-sm">
                No modules found
              </div>
            ) : (
              modulesState.modules.map((module, index) => (
                <button
                  key={module._id}
                  onClick={() => handleModuleClick(index, module.slug.current)}
                  className={`group w-full text-left p-0 transition-colors ${
                    pageState.currentPage === 'module' && videoState.currentModuleIndex === index
                      ? 'bg-light text-dark'
                      : 'hover:bg-light hover:text-primary'
                  }`}
                >
                  <div className="flex flex-col p-3 pb-8 justify-start space-y-1 border-b border-light">
                    <div className={`w-6 h-6 justify-center text-xl font-serif font-bold ${
                      pageState.currentPage === 'module' && videoState.currentModuleIndex === index
                        ? 'text-dark'
                        : 'text-light group-hover:text-dark'
                    }`}>
                      {index === 0 ? 'PRELUDE' : toRomanNumeral(module.order)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{module.title}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom section with logo and content pages */}
        <div className="mt-auto">
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