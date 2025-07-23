import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { muxInput } from 'sanity-plugin-mux-input'

import { schemaTypes } from './src/schemas'

export default defineConfig({
  name: 'default',
  title: 'Worm Girl Educational App',

  projectId: '8dob17cg',
  dataset: 'production',
  token: process.env.SANITY_API_WRITE_TOKEN,

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content Management')
          .items([
            // Educational Modules
            S.listItem()
              .title('📚 Educational Modules')
              .child(
                S.documentTypeList('module')
                  .title('Educational Modules')
                  .defaultOrdering([{ field: 'order', direction: 'asc' }])
              ),
            
            S.divider(),
            
            // Content Pages
            S.listItem()
              .title('📄 Content Pages')
              .child(
                S.documentTypeList('contentPage')
                  .title('Content Pages')
                  .defaultOrdering([{ field: 'title', direction: 'asc' }])
              ),
              
            S.divider(),
            
            // Other document types
            ...S.documentTypeListItems().filter(
              (item) => !['module', 'contentPage'].includes(item.getId()!)
            ),
          ]),
    }),
    visionTool(),
    muxInput({
      mp4_support: 'standard',
      // Try adding these options
      ...(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET && {
        enableSignedUrls: false, // Start with unsigned URLs
        mp4_support: 'standard'
      })
    }),
  ],

  schema: {
    types: schemaTypes,
  },
}) 