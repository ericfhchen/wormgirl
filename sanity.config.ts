import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { muxInput } from 'sanity-plugin-mux-input'
import { presentationTool } from 'sanity/presentation'

import { schemaTypes } from './src/schemas'

export default defineConfig({
  name: 'default',
  title: 'Worm Girl Educational App',

  projectId: '8dob17cg',
  dataset: 'production',

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
      mp4_support: 'standard'
    }),
    presentationTool({
      locate: (params, context) => {
        // Generate preview URLs for different document types
        if (params.type === 'module') {
          return {
            locations: [
              {
                title: 'Module Preview',
                href: `/?module=${params.id}&preview=true`,
                icon: () => '🎓',
              },
            ],
          }
        }
        
        if (params.type === 'contentPage') {
          return {
            locations: [
              {
                title: 'Page Preview',
                href: `/?page=${params.id}&preview=true`,
                icon: () => '📄',
              },
            ],
          }
        }
        
        return null
      },
      previewUrl: {
        origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        previewMode: {
          enable: '/api/preview',
        },
      },
    }),
  ],

  schema: {
    types: schemaTypes,
  },
}) 