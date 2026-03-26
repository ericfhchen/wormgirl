# Archived Stills Section Code

This folder contains all the code related to the "Stills" section feature that was removed from the active codebase on November 20, 2025.

## What was removed:

### 1. Schema Files
- `imageGallerySection.js` - Complete Sanity CMS schema for image gallery sections
- Updates to `contentPage.js` - Removed 'stills' pageType option and imageGallerySection reference
- Updates to `index.js` - Removed imageGallerySection import

### 2. TypeScript Types (from `src/lib/sanity.ts`)
- `SanityImageGallerySection` interface
- `'stills'` value from `SanityContentPage.pageType` union type
- GROQ query fragments for imageGallerySection

### 3. Component Code
- `renderImageGallerySection()` function from `ContentPanel.tsx` and `MobileTopMenu.tsx`
- Stills-specific state management (vertical tabs, gallery view modes)
- Stills-specific rendering logic
- Gallery maximization/expansion behavior

## Files Modified (removed stills code from):
- `src/schemas/imageGallerySection.js` - MOVED to this archive
- `src/schemas/contentPage.js` - Removed 'stills' pageType
- `src/schemas/index.js` - Removed imageGallerySection import
- `src/lib/sanity.ts` - Removed SanityImageGallerySection interface and queries
- `src/components/ContentPanel.tsx` - Removed stills rendering logic
- `src/components/MobileTopMenu.tsx` - Removed stills rendering logic

## How to Restore:

If you want to re-implement the stills section in the future:

1. Copy `imageGallerySection.js` back to `src/schemas/`
2. Add the import to `src/schemas/index.js`
3. Restore the 'stills' pageType option in `src/schemas/contentPage.js`
4. Add back the TypeScript types to `src/lib/sanity.ts` (see `removed-code-snippets.md`)
5. Add back the GROQ query fragments for imageGallerySection
6. Restore the component rendering logic from the code snippets
7. Redeploy your Sanity studio schema

## Contents:
- `imageGallerySection.js` - The complete schema file
- `removed-code-snippets.md` - All the code snippets that were removed from various files

