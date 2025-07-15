import { useState, useEffect, useMemo } from 'react'

interface GlossaryTerm {
  id: string
  term: string
  definition: any[] // Portable text content
}

export function useGlossary(glossaryTerms: any[] = []) {
  const [glossaryRefs, setGlossaryRefs] = useState<string[]>([])
  
  // Create glossary terms mapping
  const glossaryMap = useMemo(() => {
    const map = new Map<string, GlossaryTerm>()
    
    glossaryTerms.forEach((term) => {
      if (term.id) {
        map.set(term.id, {
          id: term.id,
          term: term.term,
          definition: term.definition
        })
      }
    })
    
    return map
  }, [glossaryTerms])
  
  // Register a glossary reference when it appears in the text
  const registerGlossaryRef = (glossaryId: string) => {
    setGlossaryRefs(prev => {
      if (!prev.includes(glossaryId)) {
        return [...prev, glossaryId]
      }
      return prev
    })
    
    return glossaryMap.get(glossaryId)?.term || '?'
  }
  
  // Get all referenced glossary terms in order of appearance
  const getReferencedGlossaryTerms = () => {
    return glossaryRefs
      .map(id => glossaryMap.get(id))
      .filter(Boolean) as GlossaryTerm[]
  }
  
  // Scroll to glossary term
  const scrollToGlossaryTerm = (glossaryId: string) => {
    const element = document.getElementById(`glossary-${glossaryId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  
  // Scroll back to glossary reference
  const scrollToGlossaryReference = (glossaryId: string) => {
    const element = document.getElementById(`glossary-ref-${glossaryId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
  
  // Reset glossary refs when module changes
  useEffect(() => {
    setGlossaryRefs([])
  }, [glossaryTerms])
  
  return {
    registerGlossaryRef,
    getReferencedGlossaryTerms,
    scrollToGlossaryTerm,
    scrollToGlossaryReference,
    glossaryMap
  }
} 