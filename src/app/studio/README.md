# Worm Girl Educational App - Sanity Studio

## Overview
This project uses Sanity CMS for content management with integrated MUX for video handling. The studio is configured to manage educational modules and content pages.

## Access Options

### 1. Embedded Studio (Recommended)
Access the studio through your Next.js app at:
```
http://localhost:3000/studio
```

### 2. Standalone Studio
Run the studio independently:
```bash
npm run studio
```
This will start the studio at `http://localhost:3333`

## Studio Features

### Content Structure
- **📚 Educational Modules**: Main learning content with video integration
- **📄 Content Pages**: Static pages and supporting content
- **🎥 MUX Video Integration**: Seamless video upload and playback

### Content Types

#### Educational Modules
- Title and description
- Learning objectives
- Video content (via MUX)
- Portable text content
- Order for sequencing
- Categories and tags

#### Content Pages
- Flexible page structure
- Rich text blocks
- Image galleries
- Category sections

## Environment Variables

Required environment variables (already configured in `.env.local`):

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=8dob17cg
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2023-12-01
SANITY_API_READ_TOKEN=your_read_token
SANITY_API_WRITE_TOKEN=your_write_token

# MUX Configuration
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
NEXT_PUBLIC_MUX_ENV_KEY=your_mux_env_key
```

## Schema Structure

Schemas are organized in `/src/schemas/`:
- `module.js` - Educational module structure
- `contentPage.js` - Content page structure
- `blockContent.js` - Rich text configuration
- `textBlock.js`, `categorySection.js`, `imageGallerySection.js` - Content blocks

## File Organization

### Root Level (Essential Files Only)
- `sanity.config.ts` - Main Sanity configuration for Next.js integration
- `sanity.cli.ts` - CLI configuration for standalone studio

### Studio Directory (`/src/app/studio/`)
- `config.ts` - Standalone studio configuration
- `[[...tool]]/page.tsx` - Next.js studio page component
- `layout.tsx` - Studio layout
- `loading.tsx` - Loading component
- `README.md` - This documentation

## Scripts

```bash
# Start embedded studio with Next.js
npm run dev

# Start standalone studio
npm run studio

# Build studio for deployment
npm run studio:build

# Deploy studio to Sanity hosting
npm run studio:deploy
```

## Studio Customization

The studio structure is configured in:
- `sanity.config.ts` (for Next.js integration and main app usage)
- `src/app/studio/config.ts` (for standalone studio with enhanced features)

### Key Features:
- Custom document structure with icons
- Ordered content lists
- MUX plugin for video handling
- Vision plugin for GROQ testing

## Deployment

### Studio Deployment
Deploy the studio to Sanity's hosting:
```bash
npm run studio:deploy
```

### Next.js Integration
The studio is embedded at `/studio` route in your Next.js app and will deploy automatically with your app.

## Security Notes

- Read tokens are public (used in frontend)
- Write tokens are private (used in studio only)
- MUX credentials should be kept secure
- Never commit `.env.local` to version control 