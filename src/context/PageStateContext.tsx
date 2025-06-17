'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Types
export type PageType = 'module' | 'consulting' | 'stills' | 'installations' | 'about'

interface PageState {
  currentPage: PageType
  currentPageSlug: string | null
  previousModuleIndex: number | null
}

interface PageStateContextType {
  state: PageState
  setCurrentPage: (page: PageType, slug?: string) => void
  setModulePage: (moduleIndex: number, slug: string) => void
  isModulePage: boolean
}

// Context
const PageStateContext = createContext<PageStateContextType | undefined>(undefined)

// Provider
export function PageStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageState>({
    currentPage: 'module',
    currentPageSlug: null,
    previousModuleIndex: null
  })

  const setCurrentPage = (page: PageType, slug?: string) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      currentPageSlug: slug || null,
      // Store the last module index when switching to non-module pages
      previousModuleIndex: page !== 'module' && prev.currentPage === 'module' 
        ? prev.previousModuleIndex 
        : prev.previousModuleIndex
    }))
  }

  const setModulePage = (moduleIndex: number, slug: string) => {
    setState(prev => ({
      ...prev,
      currentPage: 'module',
      currentPageSlug: slug,
      previousModuleIndex: moduleIndex
    }))
  }

  const isModulePage = state.currentPage === 'module'

  const value: PageStateContextType = {
    state,
    setCurrentPage,
    setModulePage,
    isModulePage
  }

  return <PageStateContext.Provider value={value}>{children}</PageStateContext.Provider>
}

// Hook
export function usePageState() {
  const context = useContext(PageStateContext)
  if (context === undefined) {
    throw new Error('usePageState must be used within a PageStateProvider')
  }
  return context
} 