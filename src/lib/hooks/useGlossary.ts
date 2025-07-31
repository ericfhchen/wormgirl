import { useRef, useEffect, useMemo } from 'react'

interface GlossaryTerm {
  id: string
  term: string
  definition: any[] // Portable text content
}

export function useGlossary(glossaryTerms: any[] = []) {
  const glossaryRefsRef = useRef<Set<string>>(new Set())
  
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

  // Helper: resolve the active content-scroll element with measurable height
  const getScrollContainer = (): HTMLElement | null => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('.content-scroll'))
    return (
      candidates.find((el) => el.clientHeight > 0 && el.scrollHeight > el.clientHeight) ||
      candidates.find((el) => el.clientHeight > 0) ||
      candidates[0] ||
      null
    )
  }
  
  // Register a glossary reference when it appears in the text
  const registerGlossaryRef = (glossaryId: string) => {
    glossaryRefsRef.current.add(glossaryId)
    return glossaryMap.get(glossaryId)?.term || '?'
  }
  
  // Get all referenced glossary terms in order of appearance
  const getReferencedGlossaryTerms = () => {
    return Array.from(glossaryRefsRef.current)
      .map(id => glossaryMap.get(id))
      .filter(Boolean) as GlossaryTerm[]
  }
  
  // Scroll to glossary term
  const scrollToGlossaryTerm = (glossaryId: string) => {
    const element = document.getElementById(`glossary-${glossaryId}`)
    if (element) {
      const container = getScrollContainer()
      if (container) {
        const offsetTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top
        const target = container.scrollTop + offsetTop - 12
        requestAnimationFrame(() => {
          console.debug('[Glossary] scrollToTerm', {
            glossaryId,
            container,
            currentScroll: container.scrollTop,
            target,
            containerClientHeight: container.clientHeight,
            containerScrollHeight: container.scrollHeight
          })
          const max = container.scrollHeight - container.clientHeight
          const clamped = Math.max(0, Math.min(target, max))
          container.scrollTo({ top: clamped, behavior: 'smooth' })
        })
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
  
  // Scroll back to glossary reference
  const scrollToGlossaryReference = (glossaryId: string) => {
    const element = document.getElementById(`glossary-ref-${glossaryId}`)
    if (element) {
      const container = getScrollContainer()
      if (container) {
        const offsetTop = element.getBoundingClientRect().top - container.getBoundingClientRect().top
        const target = container.scrollTop + offsetTop - 12
        requestAnimationFrame(() => {
          console.debug('[Glossary] scrollToReference', {
            glossaryId,
            container,
            currentScroll: container.scrollTop,
            target,
            containerClientHeight: container.clientHeight,
            containerScrollHeight: container.scrollHeight
          })
          const max = container.scrollHeight - container.clientHeight
          const clamped = Math.max(0, Math.min(target, max))
          container.scrollTo({ top: clamped, behavior: 'smooth' })
        })
      } else {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }
  
  // Reset glossary refs when module changes
  useEffect(() => {
    glossaryRefsRef.current.clear()
  }, [glossaryTerms])
  
  return {
    registerGlossaryRef,
    getReferencedGlossaryTerms,
    scrollToGlossaryTerm,
    scrollToGlossaryReference,
    glossaryMap
  }
} 