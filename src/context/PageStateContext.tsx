'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Types
export type PageType = 'module' | 'consulting' | 'stills' | 'installations' | 'about'

// Panel can be fully hidden, showing just a small peek, or fully expanded
type PanelStage = 'hidden' | 'peek' | 'expanded'

interface PageState {
  currentPage: PageType
  currentPageSlug: string | null
  previousModuleIndex: number | null

  // Replaces the old boolean with richer information
  contentPanelStage: PanelStage

  // Whether the top content menu (mobile) is open
  isTopMenuOpen: boolean
}

interface PageStateContextType {
  state: PageState
  setCurrentPage: (page: PageType, slug?: string) => void
  setModulePage: (moduleIndex: number, slug: string) => void
  toggleContentPanel: () => void
  expandContentPanel: () => void
  collapseContentPanel: () => void
  showPeek: () => void
  setContentPanelStage: (stage: PanelStage) => void
  openTopMenu: () => void
  closeTopMenu: () => void
  toggleTopMenu: () => void
  isModulePage: boolean
  isContentPanelExpanded: boolean
}

// Context
const PageStateContext = createContext<PageStateContextType | undefined>(undefined)

// Provider
export function PageStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageState>({
    currentPage: null as any,
    currentPageSlug: null,
    previousModuleIndex: null,
    contentPanelStage: 'hidden',
    isTopMenuOpen: false,
  })

  const setCurrentPage = (page: PageType, slug?: string) => {
    setState(prev => ({
      ...prev,
      currentPage: page,
      currentPageSlug: slug || null,
      // Preserve last module index so we can return to it later
      previousModuleIndex: page !== 'module' && prev.currentPage === 'module'
        ? prev.previousModuleIndex
        : prev.previousModuleIndex,
      // For non-module pages we open the panel fully so user can read immediately
      contentPanelStage: 'expanded',
    }))
  }

  const setModulePage = (moduleIndex: number, slug: string) => {
    setState(prev => ({
      ...prev,
      currentPage: 'module',
      currentPageSlug: slug,
      previousModuleIndex: moduleIndex,
      // On mobile we just peek the panel so video transition is visible. On desktop we'll still treat this as expanded via helper below.
      contentPanelStage: 'peek',
    }))
  }

  // ---- Panel helpers ---- //

  const setContentPanelStage = (stage: PanelStage) => {
    setState(prev => ({ ...prev, contentPanelStage: stage }))
  }

  const toggleContentPanel = () => {
    setState(prev => ({
      ...prev,
      contentPanelStage: prev.contentPanelStage === 'hidden' ? 'expanded' : 'hidden',
    }))
  }

  const showPeek = () => setContentPanelStage('peek')
  const expandContentPanel = () => setContentPanelStage('expanded')
  const collapseContentPanel = () => setContentPanelStage('hidden')

  // ---- Top menu helpers ---- //
  const openTopMenu = () => setState(prev => ({ ...prev, isTopMenuOpen: true }))
  const closeTopMenu = () => setState(prev => ({ ...prev, isTopMenuOpen: false }))
  const toggleTopMenu = () => setState(prev => ({ ...prev, isTopMenuOpen: !prev.isTopMenuOpen }))

  const isModulePage = state.currentPage === 'module'

  // Derived value used by existing desktop components
  const isContentPanelExpanded = state.contentPanelStage !== 'hidden'

  const value: PageStateContextType = {
    state,
    setCurrentPage,
    setModulePage,
    toggleContentPanel,
    expandContentPanel,
    collapseContentPanel,

    // New helpers
    showPeek,
    setContentPanelStage,
    openTopMenu,
    closeTopMenu,
    toggleTopMenu,

    isModulePage,
    isContentPanelExpanded,
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