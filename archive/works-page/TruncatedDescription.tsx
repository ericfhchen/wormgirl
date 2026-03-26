'use client'

import { useState, useMemo } from 'react'
import { PortableText, type PortableTextReactComponents } from '@portabletext/react'

interface TruncatedDescriptionProps {
  value: any
  components: Partial<PortableTextReactComponents>
}

// Helper function to extract plain text from PortableText blocks
function extractTextFromBlocks(blocks: any[]): string {
  if (!blocks || !Array.isArray(blocks)) return ''
  
  return blocks.map(block => {
    if (block._type === 'block' && block.children) {
      return block.children
        .map((child: any) => {
          if (typeof child === 'string') return child
          if (child.text) return child.text
          return ''
        })
        .join('')
    }
    return ''
  }).join(' ').trim()
}

export default function TruncatedDescription({ value, components }: TruncatedDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Extract text and calculate character count
  const textContent = useMemo(() => {
    if (!value) return ''
    return extractTextFromBlocks(value)
  }, [value])
  
  // Estimate if content exceeds 3 lines based on character count
  // Using conservative estimate: ~60-70 characters per line for small text
  // For 3 lines, that's approximately 180-210 characters
  // We'll use 200 as a threshold to be safe
  const shouldShowToggle = useMemo(() => {
    if (!textContent) return false
    // Count characters (excluding extra whitespace)
    const charCount = textContent.replace(/\s+/g, ' ').length
    // Conservative threshold for 3 lines of small text
    return charCount > 200
  }, [textContent])

  return (
    <div
      style={{
        // Lock width to prevent shifts
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        // Prevent layout shifts by containing layout calculations
        contain: 'layout',
        // Maintain stable positioning
        position: 'relative',
        display: 'block'
      }}
    >
      {/* Visible content */}
      <div 
        className="prose-custom"
        style={{
          // Ensure content width is stable
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div 
          className={isExpanded ? '' : 'line-clamp-3'}
          style={{
            // Only set display when expanded (line-clamp needs -webkit-box)
            ...(isExpanded ? { display: 'block' } : {})
          }}
        >
          <PortableText value={value} components={components} />
        </div>
      </div>
      
      {shouldShowToggle && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs no-underline hover:text-light transition-all text-muted cursor-pointer"
        >
          {isExpanded ? 'Less' : 'See More'}
        </button>
      )}
    </div>
  )
}

