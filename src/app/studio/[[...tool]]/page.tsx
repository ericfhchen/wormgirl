'use client'

import { lazy, Suspense } from 'react'
import config from '../config'

// Dynamic import to avoid client boundary issues with framer-motion
const NextStudio = lazy(() => 
  import('next-sanity/studio').then(mod => ({ default: mod.NextStudio }))
)

const StudioLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading Sanity Studio...</p>
    </div>
  </div>
)

export default function StudioPage() {
  return (
    <Suspense fallback={<StudioLoading />}>
      <NextStudio config={config} />
    </Suspense>
  )
} 