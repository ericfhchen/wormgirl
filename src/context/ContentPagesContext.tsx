'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { client, CONTENT_PAGES_QUERY, SanityContentPage } from '@/lib/sanity'

interface ContentPagesState {
  pages: SanityContentPage[]
  loading: boolean
  error: string | null
}

interface ContentPagesContextType {
  state: ContentPagesState
  getPageByType: (type: SanityContentPage['pageType']) => SanityContentPage | null
  getPageBySlug: (slug: string) => SanityContentPage | null
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
        const fetchedPages: SanityContentPage[] = await client.fetch(CONTENT_PAGES_QUERY)
        console.log('✅ Content pages fetched:', fetchedPages)
        setState({ pages: fetchedPages, loading: false, error: null })
      } catch (err) {
        console.error('❌ Error fetching content pages:', err)
        setState(prev => ({ ...prev, loading: false, error: 'Failed to load content pages' }))
      }
    }

    fetchPages()
  }, [])

  const getPageByType = (type: SanityContentPage['pageType']) => {
    return state.pages.find(page => page.pageType === type) || null
  }

  const getPageBySlug = (slug: string) => {
    return state.pages.find(page => page.slug?.current === slug) || null
  }

  const value: ContentPagesContextType = {
    state,
    getPageByType,
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