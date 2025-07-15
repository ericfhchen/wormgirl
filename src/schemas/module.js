export default {
  name: 'module',
  title: 'Educational Module',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Sequential order of this module'
    },
    {
      name: 'timeline',
      title: 'Timeline',
      type: 'string',
      description: 'Timeline information for this module'
    },
    {
      name: 'video',
      title: 'Main Video',
      type: 'mux.video',
      description: 'The main educational video for this module'
    },
    {
      name: 'idleVideo',
      title: 'Idle Video',
      type: 'mux.video',
      description: 'Looping video that plays when main video ends'
    },
    {
      name: 'body',
      title: 'Article Content',
      type: 'blockContent',
      description: 'Rich text content with custom marks and inline elements'
    },
    {
      name: 'glossary',
      title: 'Glossary',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'id',
              title: 'Glossary ID',
              type: 'string',
              description: 'Must match the glossary ID used in the text (e.g., "term1", "concept2", etc.)',
              validation: Rule => Rule.required()
            },
            {
              name: 'term',
              title: 'Term',
              type: 'string',
              description: 'The term or word being defined',
              validation: Rule => Rule.required()
            },
            {
              name: 'definition',
              title: 'Definition',
              type: 'blockContent',
              description: 'The definition or explanation of the term'
            }
          ],
          preview: {
            select: {
              id: 'id',
              term: 'term',
              definition: 'definition'
            },
            prepare(selection) {
              const { id, term, definition } = selection
              const block = (definition || []).find(block => block._type === 'block')
              const text = block
                ? block.children
                    .filter(child => child._type === 'span')
                    .map(span => span.text)
                    .join('')
                : 'Empty definition'
              return {
                title: `${term} [${id}]`,
                subtitle: `${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`
              }
            }
          }
        }
      ],
      description: 'Define glossary terms that can be referenced in the article content'
    },
    {
      name: 'footnotes',
      title: 'Footnotes',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'id',
              title: 'Footnote ID',
              type: 'string',
              description: 'Must match the footnote ID used in the text (e.g., "1", "2", etc.)',
              validation: Rule => Rule.required()
            },
            {
              name: 'content',
              title: 'Footnote Content',
              type: 'blockContent',
              description: 'The actual footnote text'
            }
          ],
          preview: {
            select: {
              id: 'id',
              content: 'content'
            },
            prepare(selection) {
              const { id, content } = selection
              const block = (content || []).find(block => block._type === 'block')
              const text = block
                ? block.children
                    .filter(child => child._type === 'span')
                    .map(span => span.text)
                    .join('')
                : 'Empty footnote'
              return {
                title: `[${id}] ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                subtitle: 'Footnote'
              }
            }
          }
        }
      ],
      description: 'Define footnotes that can be referenced in the article content'
    }
  ],
  preview: {
    select: {
      title: 'title',
      order: 'order'
    },
    prepare(selection) {
      const { title, order } = selection
      return {
        title: title,
        subtitle: `Module ${order || 'No order set'}`
      }
    }
  },
  orderings: [
    {
      title: 'Order',
      name: 'orderAsc',
      by: [
        {field: 'order', direction: 'asc'}
      ]
    }
  ]
} 