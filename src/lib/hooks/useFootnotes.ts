import { useState, useEffect, useMemo } from 'react'

interface Footnote {
  id: string
  content: any[] // Portable text content
  number: number
}

export function useFootnotes(footnotes: any[] = []) {
  const [footnoteRefs, setFootnoteRefs] = useState<string[]>([])
  
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
  
  // Register a footnote reference when it appears in the text
  const registerFootnoteRef = (footnoteId: string) => {
    setFootnoteRefs(prev => {
      if (!prev.includes(footnoteId)) {
        return [...prev, footnoteId]
      }
      return prev
    })
    
    return footnotesMap.get(footnoteId)?.number || '?'
  }
  
  // Get all referenced footnotes in order of appearance
  const getReferencedFootnotes = () => {
    return footnoteRefs
      .map(id => footnotesMap.get(id))
      .filter(Boolean) as Footnote[]
  }
  
  // Scroll to footnote
  const scrollToFootnote = (footnoteId: string) => {
    const element = document.getElementById(`footnote-${footnoteId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  
  // Scroll back to footnote reference
  const scrollToReference = (footnoteId: string) => {
    const element = document.getElementById(`footnote-ref-${footnoteId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  
  // Reset footnote refs when module changes
  useEffect(() => {
    setFootnoteRefs([])
  }, [footnotes])
  
  return {
    registerFootnoteRef,
    getReferencedFootnotes,
    scrollToFootnote,
    scrollToReference,
    footnotesMap
  }
} 