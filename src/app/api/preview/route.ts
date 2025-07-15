import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { validatePreviewUrl } from '@sanity/preview-url-secret'
import { client } from '@/lib/sanity'

const clientWithToken = client.withConfig({
  token: process.env.SANITY_API_READ_TOKEN,
})

export async function GET(request: NextRequest) {
  const { isValid, redirectTo = '/' } = await validatePreviewUrl(clientWithToken, request.url)
  
  if (!isValid) {
    return new Response('Invalid secret', { status: 401 })
  }

  redirect(redirectTo)
} 