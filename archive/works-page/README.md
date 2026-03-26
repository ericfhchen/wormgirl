# Archived: Works Page

Archived on 2026-03-26.

## What was removed
- `worksPage.js` — Sanity CMS schema for the Works Page document type
- `project.js` — Sanity CMS schema for individual Project documents (referenced by Works Page)
- Works page rendering in `ContentPanel.tsx` and `MobileTopMenu.tsx`
- `SanityWorksPage` type and GROQ query clauses in `sanity.ts`
- Schema registrations in `schemas/index.js`

## Restoration
To restore, move the schema files back to `src/schemas/`, re-register them in `schemas/index.js`, and re-add `"worksPage"` to the GROQ queries in `sanity.ts`. The rendering code can be found in git history.
