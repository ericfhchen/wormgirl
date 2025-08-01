import { useRef, useEffect, useMemo } from 'react'

interface Footnote {
  id: string
  content: any[] // Portable text content
  number: number
}

export function useFootnotes(footnotes: any[] = []) {
  // Track which footnote IDs have appeared in the rich-text so we can order definitions later.
  const footnoteRefsRef = useRef<Set<string>>(new Set())
  
  // Create numbered footnotes mapping
  const footnotesMap = useMemo(() => {
    const map = new Map<string, Footnote>()
    
    footnotes.forEach((footnote, index) => {
      if (footnote.id) {
        map.set(footnote.id, {
          id: footnote.id,
          content: footnote.content,
          number: index + 1
        })
      }
    })
    
    return map
  }, [footnotes])

  // Helper: find the currently mounted scroll container with height > 0
  const getScrollContainer = (): HTMLElement | null => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('.content-scroll'))
    return (
      candidates.find((el) => el.clientHeight > 0 && el.scrollHeight > el.clientHeight) ||
      candidates.find((el) => el.clientHeight > 0) ||
      candidates[0] ||
      null
    )
  }
  
  // Register a footnote reference when it appears in the text
  const registerFootnoteRef = (footnoteId: string) => {
    footnoteRefsRef.current.add(footnoteId)
    return footnotesMap.get(footnoteId)?.number || '?'
  }
  
  // Get all referenced footnotes in order of appearance
  const getReferencedFootnotes = () => {
    return Array.from(footnoteRefsRef.current)
      .map(id => footnotesMap.get(id))
      .filter(Boolean) as Footnote[]
  }
  
  // Scroll to footnote
  const scrollToFootnote = (footnoteId: string) => {
    // Try immediately – if the target isn't mounted yet we'll retry on the next frame.
    const attemptScroll = (attempt = 0) => {
      const element = document.getElementById(`footnote-${footnoteId}`)
      if (element) {
        const container = getScrollContainer()
        if (container) {
          const offsetTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top
          const target = container.scrollTop + offsetTop - 12 // position inside scroll area
          const max = container.scrollHeight - container.clientHeight
          const clamped = Math.max(0, Math.min(target, max))
          container.scrollTo({ top: clamped, behavior: 'smooth' })
        } else {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      } else if (attempt < 5) {
        // Definitions may not be rendered yet – try again on the next animation frame
        requestAnimationFrame(() => attemptScroll(attempt + 1))
      }
    }

    attemptScroll()
  }
  
  // Scroll back to footnote reference
  const scrollToReference = (footnoteId: string) => {
    const attemptScroll = (attempt = 0) => {
      const element = document.getElementById(`footnote-ref-${footnoteId}`)
      if (element) {
        const container = getScrollContainer()
        if (container) {
          const offsetTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top
          const target = container.scrollTop + offsetTop - 12
          const max = container.scrollHeight - container.clientHeight
          const clamped = Math.max(0, Math.min(target, max))
          container.scrollTo({ top: clamped, behavior: 'smooth' })
        } else {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      } else if (attempt < 5) {
        requestAnimationFrame(() => attemptScroll(attempt + 1))
      }
    }

    attemptScroll()
  }
  
  // Reset footnote refs when module changes
  useEffect(() => {
    // When the module (and thus footnotes array) changes we reset the seen-refs set
    footnoteRefsRef.current.clear()
  }, [footnotes])
  
  return {
    registerFootnoteRef,
    getReferencedFootnotes,
    scrollToFootnote,
    scrollToReference,
    footnotesMap
  }
} 