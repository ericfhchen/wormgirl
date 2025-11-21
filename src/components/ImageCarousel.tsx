'use client'

import { useState, useEffect, useRef } from 'react'

interface ImageCarouselProps {
  images: Array<{
    asset?: {
      url: string
    }
    caption?: string
    alt?: string
  }>
  projectTitle?: string
}

export default function ImageCarousel({ images, projectTitle }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [containerHeight, setContainerHeight] = useState<number | null>(null)
  const imageRefs = useRef<(HTMLImageElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [imagesLoaded, setImagesLoaded] = useState(false)

  if (!images || images.length === 0) {
    return null
  }

  useEffect(() => {
    // Measure all images once they load
    const measureImages = () => {
      if (!containerRef.current) return

      const containerWidth = containerRef.current.offsetWidth
      let maxHeight = 0

      imageRefs.current.forEach((img) => {
        if (img && img.complete && img.naturalWidth && img.naturalHeight) {
          // Calculate the height this image would have at the container width
          const aspectRatio = img.naturalHeight / img.naturalWidth
          const calculatedHeight = containerWidth * aspectRatio
          maxHeight = Math.max(maxHeight, calculatedHeight)
        }
      })

      if (maxHeight > 0) {
        setContainerHeight(maxHeight)
        setImagesLoaded(true)
      }
    }

    // Check if all images are already loaded
    const allLoaded = imageRefs.current.every((img) => img?.complete)
    if (allLoaded && imageRefs.current.length === images.length) {
      measureImages()
    }

    // Also measure on window resize
    window.addEventListener('resize', measureImages)
    return () => window.removeEventListener('resize', measureImages)
  }, [images])

  const handleImageLoad = () => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    let maxHeight = 0

    imageRefs.current.forEach((img) => {
      if (img && img.complete && img.naturalWidth && img.naturalHeight) {
        const aspectRatio = img.naturalHeight / img.naturalWidth
        const calculatedHeight = containerWidth * aspectRatio
        maxHeight = Math.max(maxHeight, calculatedHeight)
      }
    })

    if (maxHeight > 0) {
      setContainerHeight(maxHeight)
      setImagesLoaded(true)
    }
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const midpoint = width / 2

    if (clickX < midpoint) {
      goToPrevious()
    } else {
      goToNext()
    }
  }

  const currentImage = images[currentIndex]

  return (
    <div className="space-y-1">
      <div 
        ref={containerRef}
        className="w-full cursor-pointer relative"
        onClick={handleImageClick}
        style={containerHeight ? { height: `${containerHeight}px`, minHeight: `${containerHeight}px` } : undefined}
      >
        {/* Hidden images for measurement */}
        <div className="absolute inset-0 opacity-0 pointer-events-none">
          {images.map((image, idx) => (
            image.asset?.url && (
              <img
                key={`measure-${idx}`}
                ref={(el) => {
                  imageRefs.current[idx] = el
                }}
                src={image.asset.url}
                alt=""
                className="w-full h-auto"
                onLoad={handleImageLoad}
                loading="lazy"
              />
            )
          ))}
        </div>
        {/* Visible current image */}
        {currentImage.asset?.url && imagesLoaded && (
          <img
            src={currentImage.asset.url}
            alt={currentImage.alt || projectTitle || 'Carousel image'}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}
        {!imagesLoaded && currentImage.asset?.url && (
          <img
            src={currentImage.asset.url}
            alt={currentImage.alt || projectTitle || 'Carousel image'}
            className="w-full h-auto"
            loading="lazy"
          />
        )}
      </div>
      <div className="flex justify-between items-center">
        <button
          onClick={goToPrevious}
          className="text-xs text-muted hover:text-light transition-colors"
        >
          Prev
        </button>
        <button
          onClick={goToNext}
          className="text-xs text-muted hover:text-light transition-colors"
        >
          Next
        </button>
      </div>
      {currentImage.caption && (
        <p className="text-xs text-muted mt-2">{currentImage.caption}</p>
      )}
    </div>
  )
}

