import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { muxInput } from 'sanity-plugin-mux-input'

import { schemaTypes } from '../src/schemas'

export default defineConfig({
  name: 'default',
  title: 'Worm Girl Educational App',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Educational Modules')
              .child(
                S.documentTypeList('module')
                  .title('Educational Modules')
                  .defaultOrdering([{ field: 'order', direction: 'asc' }])
              ),
            S.divider(),
            S.listItem()
              .title('Content Pages')
              .child(
                S.documentTypeList('contentPage')
                  .title('Content Pages')
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (item) => !['module', 'contentPage'].includes(item.getId()!)
            ),
          ]),
    }),
    visionTool(),
    muxInput(),
  ],

  schema: {
    types: schemaTypes,
  },
}) 