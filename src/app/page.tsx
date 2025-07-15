'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'
import { client } from '@/lib/sanity'

// Preview-enabled Sanity client
const previewClient = client.withConfig({
  token: process.env.NEXT_PUBLIC_SANITY_TOKEN,
  perspective: 'previewDrafts',
})

function PreviewHandler() {
  const searchParams = useSearchParams()
  const { setCurrentPage, setModulePage, expandContentPanel } = usePageState()
  const { playModule } = useVideo()
  
  const isPreview = searchParams.get('preview') === 'true'
  const moduleId = searchParams.get('module')
  const pageId = searchParams.get('page')

  const handleModulePreview = async (id: string) => {
    try {
      const clientToUse = isPreview ? previewClient : client
      
      // First, get all modules to find the index
      const modules = await clientToUse.fetch(`
        *[_type == "module"] | order(order asc) {
          _id,
          slug
        }
      `)
      
      // Find the module index by ID or slug
      const moduleIndex = modules.findIndex((module: any) => 
        module._id === id || module.slug?.current === id
      )
      
      if (moduleIndex >= 0) {
        // Set the module and play the video
        playModule(moduleIndex)
        setModulePage(moduleIndex, modules[moduleIndex].slug?.current || id)
      }
    } catch (error) {
      console.error('Error handling module preview:', error)
    }
  }

  const handlePagePreview = async (id: string) => {
    try {
      const clientToUse = isPreview ? previewClient : client
      
      // Get the page info
      const page = await clientToUse.fetch(`
        *[_type == "contentPage" && (_id == $id || slug.current == $id)][0] {
          _id,
          slug,
          pageType
        }
      `, { id })
      
      if (page) {
        setCurrentPage(page.pageType, page.slug?.current || id)
      }
    } catch (error) {
      console.error('Error handling page preview:', error)
    }
  }

  useEffect(() => {
    if (!isPreview) return

    // Automatically expand content panel in preview mode
    expandContentPanel()

    if (moduleId) {
      // Handle module preview
      handleModulePreview(moduleId)
    } else if (pageId) {
      // Handle page preview
      handlePagePreview(pageId)
    }
  }, [isPreview, moduleId, pageId, expandContentPanel, handleModulePreview, handlePagePreview])

  return null
}

export default function HomePage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div>Loading...</div>}>
        <PreviewHandler />
      </Suspense>
    </div>
  )
} 