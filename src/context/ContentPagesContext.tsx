'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { client, CONTENT_PAGES_QUERY, SanityPage } from '@/lib/sanity'

interface ContentPagesState {
  pages: SanityPage[]
  loading: boolean
  error: string | null
}

interface ContentPagesContextType {
  state: ContentPagesState
  getPageBySlug: (slug: string) => SanityPage | null
}

const initialState: ContentPagesState = {
  pages: [],
  loading: true,
  error: null,
}

const ContentPagesContext = createContext<ContentPagesContextType | undefined>(undefined)

export function ContentPagesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ContentPagesState>(initialState)

  useEffect(() => {
    async function fetchPages() {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))
        const fetchedPages: SanityPage[] = await client.fetch(CONTENT_PAGES_QUERY)
        setState({ pages: fetchedPages, loading: false, error: null })
      } catch (err) {
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load content pages' }))
      }
    }

    fetchPages()
  }, [])

  const getPageBySlug = (slug: string) => {
    return state.pages.find(page => page.slug?.current === slug) || null
  }

  const value: ContentPagesContextType = {
    state,
    getPageBySlug,
  }

  return <ContentPagesContext.Provider value={value}>{children}</ContentPagesContext.Provider>
}

export function useContentPages() {
  const context = useContext(ContentPagesContext)
  if (context === undefined) {
    throw new Error('useContentPages must be used within a ContentPagesProvider')
  }
  return context
}