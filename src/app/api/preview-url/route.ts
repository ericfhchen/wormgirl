import { NextRequest, NextResponse } from 'next/server'
import { client } from '@/lib/sanity'

const clientWithToken = client.withConfig({
  token: process.env.SANITY_API_READ_TOKEN,
})

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (!secret) {
    return NextResponse.json({ message: 'Missing secret' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { _type, slug, _id } = body
    
    let previewUrl = '/'
    
    if (_type === 'module') {
      // For modules, we'll show the main page with the module selected
      previewUrl = `/?module=${slug?.current || _id}&preview=true`
    } else if (_type === 'contentPage') {
      // For content pages, we'll show the page content
      previewUrl = `/?page=${slug?.current || _id}&preview=true`
    }
    
    return NextResponse.json({ previewUrl })
  } catch (error) {
    console.error('Preview URL error:', error)
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
  }
} 