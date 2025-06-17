'use client'

import { usePageState } from '@/context/PageStateContext'
import { useVideo } from '@/context/VideoContext'

export default function ContentPanel() {
  const { state: pageState } = usePageState()
  const { state: videoState } = useVideo()

  // Mock content for different pages
  const mockModuleContent = {
    title: "Module Content",
    content: "This is where the rich text content from Sanity will be displayed using Portable Text components."
  }

  const mockContentPageData = {
    consulting: {
      title: "Consulting Services",
      content: "Professional consulting services for your business needs."
    },
    stills: {
      title: "Photography Portfolio",
      content: "A curated collection of still photography work."
    },
    installations: {
      title: "Art Installations",
      content: "Interactive and immersive art installations."
    },
    about: {
      title: "About Us",
      content: "Learn more about our mission and team."
    }
  }

  const renderModuleContent = () => (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Module {videoState.currentModuleIndex + 1}: {mockModuleContent.title}
          </h1>
          <p className="text-muted-foreground">
            Educational content synchronized with the video above
          </p>
        </header>

        <div className="prose-custom">
          <p className="text-lg leading-relaxed mb-6">
            {mockModuleContent.content}
          </p>
          
          <h2>Key Learning Points</h2>
          <ul>
            <li>Understanding the fundamentals</li>
            <li>Practical application techniques</li>
            <li>Real-world examples and case studies</li>
            <li>Best practices and common pitfalls</li>
          </ul>

          <h2>Interactive Elements</h2>
          <p>
            This is where custom Portable Text components would render:
          </p>
          <ul>
            <li><strong>Footnotes</strong> - Hover to reveal additional information</li>
            <li><strong>Hover Images</strong> - Interactive image overlays</li>
            <li><strong>Inline Videos</strong> - Supporting video content</li>
          </ul>

          <div className="mt-8 p-6 bg-muted rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Note</h3>
            <p className="text-sm text-muted-foreground">
              This content will be dynamically loaded from Sanity CMS and rendered 
              using @portabletext/react with custom components for rich interactive elements.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContentPage = () => {
    const currentPageData = mockContentPageData[pageState.currentPage as keyof typeof mockContentPageData]
    
    if (!currentPageData) return null

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {currentPageData.title}
            </h1>
            <p className="text-muted-foreground">
              Flexible content page with modular sections
            </p>
          </header>

          <div className="space-y-8">
            {/* Mock Category Section */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Categories</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-6 border border-border rounded-lg">
                    <div className="w-full h-32 bg-muted rounded-lg mb-4"></div>
                    <h3 className="font-medium mb-2">Category {item}</h3>
                    <p className="text-sm text-muted-foreground">
                      Description of this category and its relevance.
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Mock Text Block */}
            <section className="prose-custom">
              <h2>About This Page</h2>
              <p>{currentPageData.content}</p>
              <p>
                This page demonstrates the flexible content system using Sanity&apos;s 
                modular sections. Content editors can add, remove, and rearrange 
                sections including:
              </p>
              <ul>
                <li>Category sections with images and descriptions</li>
                <li>Image galleries with captions</li>
                <li>Rich text blocks with custom formatting</li>
              </ul>
            </section>

            {/* Mock Image Gallery Section */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Gallery</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="aspect-square bg-muted rounded-lg"></div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-background">
      {pageState.currentPage === 'module' ? renderModuleContent() : renderContentPage()}
    </div>
  )
} 