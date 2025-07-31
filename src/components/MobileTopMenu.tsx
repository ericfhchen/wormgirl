'use client'

import { usePageState } from '@/context/PageStateContext'

export default function MobileTopMenu() {
  const {
    state: pageState,
    toggleTopMenu,
    closeTopMenu,
    setCurrentPage,
  } = usePageState()

  const contentPages = [
    { slug: 'consulting', title: 'Consulting', pageType: 'consulting' as const },
    { slug: 'stills', title: 'Stills', pageType: 'stills' as const },
    { slug: 'installations', title: 'Installations', pageType: 'installations' as const },
    { slug: 'about', title: 'About', pageType: 'about' as const },
  ]

  const handlePageClick = (pageType: typeof contentPages[number]['pageType'], slug: string) => {
    setCurrentPage(pageType as any, slug)
    closeTopMenu()
  }

  return (
    <>
      {/* MENU button shown when the top menu is closed */}
      {!pageState.isTopMenuOpen && (
        <button
          onClick={toggleTopMenu}
          className="md:hidden fixed top-3 left-3 z-50 text-light text-xs tracking-widest font-serif font-extrabold"
        >
          MENU
        </button>
      )}

      {/* Top menu, only rendered when open */}
      {pageState.isTopMenuOpen && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-50">
          {/* Close bar */}
          <div className="flex items-center justify-between bg-dark/80 backdrop-blur-sm p-3 border-b border-light">
            <button
              onClick={toggleTopMenu}
              className="text-light text-sm font-medium"
            >
              Close
            </button>
          </div>

          {/* Menu options */}
          <div className="bg-dark border-b border-light w-full">
            <div className="flex overflow-x-auto space-x-3 px-4 py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {contentPages.map((page) => (
                <button
                  key={page.slug}
                  onClick={() => handlePageClick(page.pageType, page.slug)}
                  className={`flex-shrink-0 px-3 py-2 rounded-full border border-light text-xs font-medium whitespace-nowrap transition-colors ${pageState.currentPage === page.pageType ? 'bg-light text-dark' : 'text-light hover:bg-light hover:text-dark'}`}
                >
                  {page.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 