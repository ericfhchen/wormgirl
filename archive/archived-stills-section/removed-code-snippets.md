# Removed Code Snippets

This document contains all the code that was removed from various files in the codebase.

---

## src/lib/sanity.ts

### Type Definition (line ~83-92)
```typescript
export interface SanityImageGallerySection {
  _type: 'imageGallerySection'
  title?: string
  icon?: SanityImageSource
  images: {
    image: SanityImageSource
    caption?: string
    alt?: string
  }[]
}
```

### pageType Union Type (line ~68)
REMOVED: `'stills'` from the union type:
```typescript
// OLD:
pageType: 'consulting' | 'stills' | 'installations' | 'about'

// NEW:
pageType: 'consulting' | 'installations' | 'about'
```

### GROQ Query Fragment (MODULE_CONTENT_QUERY, lines ~205-217)
```typescript
_type == "imageGallerySection" => {
  title,
  icon {
    asset->
  },
  images[] {
    image {
      asset->
    },
    caption,
    alt
  }
}
```

### GROQ Query Fragment (CONTENT_PAGE_BY_SLUG_QUERY, lines ~250-262)
```typescript
_type == "imageGallerySection" => {
  title,
  icon {
    asset->
  },
  images[] {
    image {
      asset->
    },
    caption,
    alt
  }
}
```

### Import statement (add back to imports)
```typescript
import { ..., type SanityImageGallerySection } from '@/lib/sanity'
```

---

## src/components/ContentPanel.tsx

### State Variables (lines ~32-36)
```typescript
// State for vertical tabs (used in stills page)
const [activeTabIndex, setActiveTabIndex] = useState(0)

// State for stills gallery view modes
const [galleryViewMode, setGalleryViewMode] = useState<'tabs' | 'expanded' | 'maximized'>('tabs')
```

### renderImageGallerySection Function (lines ~384-435)
```typescript
const renderImageGallerySection = (section: SanityImageGallerySection) => (
  <section key={`gallery-${section.title || 'untitled'}`} className="space-y-4">
    
    <div className="space-y-24">
      {section.images?.map((imageItem, index) => {
        // Get dimensions from image asset if available
        let origW: number | undefined
        let origH: number | undefined

        // Handle different possible structures of the image asset
        if (typeof imageItem.image === 'object' && imageItem.image && 'asset' in imageItem.image) {
          const imageAsset = imageItem.image.asset as any
          origW = imageAsset?.metadata?.dimensions?.width
          origH = imageAsset?.metadata?.dimensions?.height

          // If no metadata dimensions, try to parse from asset _ref
          if (!origW || !origH) {
            const ref = imageAsset?._ref
            const match = ref?.match(/-(\d+)x(\d+)-/)
            if (match) {
              origW = parseInt(match[1], 10)
              origH = parseInt(match[2], 10)
            }
          }
        }

        // Use sensible defaults if dimensions can't be determined
        origW = origW || 800
        origH = origH || 600

        return (
          <div key={`image-${index}`} className={`space-y-2 ${isPanelExpanded ? 'max-w-[460px]' : ''}`}>
            <img
              src={urlFor(imageItem.image).width(800).quality(80).url()}
              alt={imageItem.alt || imageItem.caption || ''}
              width={origW}
              height={origH}
              className="w-full h-auto"
              loading="lazy"
              style={{ aspectRatio: `${origW}/${origH}` }}
            />
            {imageItem.caption && (
              <p className="text-xs italic text-light" style={{ fontFamily: 'Baskervville' }}>
                {imageItem.caption}
              </p>
            )}
          </div>
        )
      })}
    </div>
  </section>
)
```

### Stills Page Rendering Logic (lines ~668-800+)
This is a large section that handles the vertical tabs and expandable gallery view for stills pages. The entire conditional block:

```typescript
// Special handling for stills page with vertical tabs and expandable gallery
if (currentPageData?.pageType === 'stills' && currentPageData.sections?.length > 0) {
  // Show vertical tabs in collapsed view
  if (galleryViewMode === 'tabs') {
    return (
      <div className="flex flex-col h-full">
        {/* Vertical Tabs - takes full space when in tabs mode */}
        <div className="flex-1 flex flex-col">
          {currentPageData.sections.map((section, index) => {
            const sectionTitle = section.title || `Section ${index + 1}`
            
            return (
              <button
                key={`tab-${index}`}
                onClick={() => {
                  setActiveTabIndex(index)
                  setGalleryViewMode('expanded')
                }}
                className="flex items-center px-6 py-10 gap-2 text-left border-b border-light hover:bg-dark/30 transition-all"
              >
                {section.icon && (
                  <div className="flex-shrink-0 w-16 h-full mr-4 flex items-center">
                    <Image
                      src={urlFor(section.icon).url()}
                      alt=""
                      width={48}
                      height={48}
                      className="object-contain max-h-full w-auto"
                    />
                  </div>
                )}
                <h3 className="text-light font-medium text-xl text-base">{sectionTitle}</h3>
                
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Show expanded gallery content
  if (galleryViewMode === 'expanded' || galleryViewMode === 'maximized') {
    const activeSection = currentPageData.sections[activeTabIndex]
    const sectionTitle = activeSection?.title || `Section ${activeTabIndex + 1}`

    return (
      // ... expanded gallery view JSX ...
    )
  }
}
```

### Case statement in section rendering (lines ~762-763, ~793-794)
```typescript
case 'imageGallerySection':
  return renderImageGallerySection(activeSection as SanityImageGallerySection)
```

And:
```typescript
case 'imageGallerySection':
  return renderImageGallerySection(section as SanityImageGallerySection)
```

### useEffect for click outside handling (lines ~872-886)
```typescript
// Handle clicks outside panel to minimize when maximized (desktop only)
useEffect(() => {
  if (isMobile) return

  const handleClickOutside = (event: MouseEvent) => {
    if (galleryViewMode === 'maximized' && currentPageData?.pageType === 'stills') {
      setGalleryViewMode('expanded')
      setPanelMaximized(false)
    }
  }

  if (galleryViewMode === 'maximized') {
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }
}, [galleryViewMode, currentPageData?.pageType, setPanelMaximized, isMobile])
```

### Panel width class logic (lines ~889-893)
```typescript
// Determine panel width based on maximized state and expansion
const panelWidthClass = galleryViewMode === 'maximized' 
  ? 'w-[80vw]' 
  : isPanelExpanded 
    ? 'w-[584px]' 
    : 'w-96'
```

---

## src/components/MobileTopMenu.tsx

### State Variables (lines ~30-34)
```typescript
// State for vertical tabs (used in stills page)
const [activeTabIndex, setActiveTabIndex] = useState(0)

// State for stills gallery view modes
const [galleryViewMode, setGalleryViewMode] = useState<'tabs' | 'expanded' | 'maximized'>('tabs')
```

### renderImageGallerySection Function (lines ~130-181)
```typescript
const renderImageGallerySection = (section: SanityImageGallerySection) => (
  <section key={`gallery-${section.title || 'untitled'}`} className="space-y-4">
    
    <div className="space-y-24">
      {section.images?.map((imageItem, index) => {
        // Get dimensions from image asset if available
        let origW: number | undefined
        let origH: number | undefined

        // Handle different possible structures of the image asset
        if (typeof imageItem.image === 'object' && imageItem.image && 'asset' in imageItem.image) {
          const imageAsset = imageItem.image.asset as any
          origW = imageAsset?.metadata?.dimensions?.width
          origH = imageAsset?.metadata?.dimensions?.height

          // If no metadata dimensions, try to parse from asset _ref
          if (!origW || !origH) {
            const ref = imageAsset?._ref
            const match = ref?.match(/-(\d+)x(\d+)-/)
            if (match) {
              origW = parseInt(match[1], 10)
              origH = parseInt(match[2], 10)
            }
          }
        }

        // Use sensible defaults if dimensions can't be determined
        origW = origW || 800
        origH = origH || 600

        return (
          <div key={`image-${index}`} className="space-y-2">
            <img
              src={urlFor(imageItem.image).width(800).quality(80).url()}
              alt={imageItem.alt || imageItem.caption || ''}
              width={origW}
              height={origH}
              className="w-full h-auto"
              loading="lazy"
              style={{ aspectRatio: `${origW}/${origH}` }}
            />
            {imageItem.caption && (
              <p className="text-xs italic text-light" style={{ fontFamily: 'Baskervville' }}>
                {imageItem.caption}
              </p>
            )}
          </div>
        )
      })}
    </div>
  </section>
)
```

### Stills Page Rendering Logic (lines ~307-400+)
Similar to ContentPanel.tsx, the entire conditional block for handling stills pages with vertical tabs.

### Case statements in section rendering (lines ~385-386, ~416-417)
```typescript
case 'imageGallerySection':
  return renderImageGallerySection(activeSection as SanityImageGallerySection)
```

---

## src/schemas/contentPage.js

### pageType options (lines ~28-29)
REMOVED from the list array:
```javascript
{ title: 'Stills', value: 'stills' },
```

### sections array (line ~40)
REMOVED from the of array:
```javascript
{ type: 'imageGallerySection' },
```

---

## src/schemas/index.js

### Import statement (line ~3)
REMOVED:
```javascript
import imageGallerySection from './imageGallerySection'
```

### schemaTypes array (line ~18)
REMOVED:
```javascript
imageGallerySection,
```

---

## Notes

- The stills feature used a unique vertical tab interface with expandable/maximizable gallery views
- State management included `activeTabIndex` and `galleryViewMode`
- The feature was implemented both in desktop (ContentPanel) and mobile (MobileTopMenu) views
- The imageGallerySection schema supported images with captions and alt text
- Icons could be added to gallery sections for the tab interface

