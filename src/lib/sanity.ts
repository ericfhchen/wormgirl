import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import { SanityImageSource } from '@sanity/image-url/lib/types/types'

// Sanity client configuration
export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2023-12-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_READ_TOKEN,
})

// Image URL builder
const builder = imageUrlBuilder(client)

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

// Type definitions for Sanity documents
export interface SanityModule {
  _id: string
  _type: 'module'
  title: string
  slug: { current: string }
  order: number
  timeline?: string
  video: {
    asset: {
      playbackId: string
      assetId: string
    }
  }
  idleVideo: {
    asset: {
      playbackId: string
      assetId: string
    }
  }
  body: any[] // Portable Text blocks
  glossary?: Array<{
    id: string
    term: string
    definition: any[]
  }>
  footnotes?: Array<{
    id: string
    content: any[]
  }>
  excerpt?: string
}

export interface SanityContentPage {
  _id: string
  _type: 'contentPage'
  title: string
  slug: { current: string }
  pageType: 'consulting' | 'stills' | 'installations' | 'about'
  sections: any[] // Flexible sections array
}

export interface SanityCategorySection {
  _type: 'categorySection'
  title?: string
  categories: {
    title: string
    description?: string
    image?: SanityImageSource
  }[]
}

export interface SanityImageGallerySection {
  _type: 'imageGallerySection'
  title?: string
  images: {
    image: SanityImageSource
    caption?: string
    alt?: string
  }[]
}

export interface SanityTextBlock {
  _type: 'textBlock'
  content: any[] // Portable Text blocks
}

// GROQ Queries
export const MODULES_QUERY = `
  *[_type == "module"] | order(order asc) {
    _id,
    title,
    slug,
    order,
    timeline,
    video {
      asset-> {
        playbackId,
        assetId
      }
    },
    idleVideo {
      asset-> {
        playbackId,
        assetId
      }
    },
    body,
    glossary[] {
      id,
      term,
      definition
    },
    footnotes[] {
      id,
      content
    },
    excerpt
  }
`

export const MODULE_BY_SLUG_QUERY = `
  *[_type == "module" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    order,
    timeline,
    video {
      asset-> {
        playbackId,
        assetId
      }
    },
    idleVideo {
      asset-> {
        playbackId,
        assetId
      }
    },
    body,
    glossary[] {
      id,
      term,
      definition
    },
    footnotes[] {
      id,
      content
    },
    excerpt
  }
`

export const CONTENT_PAGES_QUERY = `
  *[_type == "contentPage"] {
    _id,
    title,
    slug,
    pageType,
    sections[] {
      _type,
      _type == "categorySection" => {
        title,
        categories[] {
          title,
          description,
          image {
            asset->
          }
        }
      },
      _type == "imageGallerySection" => {
        title,
        images[] {
          image {
            asset->
          },
          caption,
          alt
        }
      },
      _type == "textBlock" => {
        content
      }
    }
  }
`

export const CONTENT_PAGE_BY_SLUG_QUERY = `
  *[_type == "contentPage" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    pageType,
    sections[] {
      _type,
      _type == "categorySection" => {
        title,
        categories[] {
          title,
          description,
          image {
            asset->
          }
        }
      },
      _type == "imageGallerySection" => {
        title,
        images[] {
          image {
            asset->
          },
          caption,
          alt
        }
      },
      _type == "textBlock" => {
        content
      }
    }
  }
`

// Helper functions for fetching data
export async function getModules(): Promise<SanityModule[]> {
  return client.fetch(`
    *[_type == "module"] | order(order asc) {
      _id,
      title,
      slug,
      order,
      timeline,
      video,
      idleVideo,
      body,
      glossary,
      footnotes,
      excerpt
    }
  `)
}

export async function getModuleBySlug(slug: string): Promise<SanityModule | null> {
  return await client.fetch(MODULE_BY_SLUG_QUERY, { slug })
}

export async function getContentPages(): Promise<SanityContentPage[]> {
  return await client.fetch(CONTENT_PAGES_QUERY)
}

export async function getContentPageBySlug(slug: string): Promise<SanityContentPage | null> {
  return await client.fetch(CONTENT_PAGE_BY_SLUG_QUERY, { slug })
} 