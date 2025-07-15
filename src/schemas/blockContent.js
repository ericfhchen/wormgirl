export default {
  title: 'Block Content',
  name: 'blockContent',
  type: 'array',
  of: [
    {
      title: 'Block',
      type: 'block',
      styles: [
        {title: 'Normal', value: 'normal'},
        {title: 'H1', value: 'h1'},
        {title: 'H2', value: 'h2'},
        {title: 'H3', value: 'h3'},
        {title: 'H4', value: 'h4'},
        {title: 'Quote', value: 'blockquote'},
        {title: 'Intro Passage', value: 'intro'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'}
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
        ],
        annotations: [
          {
            title: 'Footnote Reference',
            name: 'footnoteRef',
            type: 'object',
            fields: [
              {
                title: 'Footnote ID',
                name: 'footnoteId',
                type: 'string',
                description: 'Must match a footnote ID in the module\'s footnotes section',
                validation: Rule => Rule.required()
              }
            ]
          },
          {
            title: 'Glossary Reference',
            name: 'glossaryRef',
            type: 'object',
            fields: [
              {
                title: 'Glossary ID',
                name: 'glossaryId',
                type: 'string',
                description: 'Must match a glossary ID in the module\'s glossary section',
                validation: Rule => Rule.required()
              }
            ]
          },
          {
            title: 'Hover Image',
            name: 'hoverImage',
            type: 'object',
            fields: [
              {
                title: 'Image',
                name: 'image',
                type: 'image'
              },
              {
                title: 'Alt Text',
                name: 'alt',
                type: 'string'
              }
            ]
          },
          {
            title: 'URL',
            name: 'link',
            type: 'object',
            fields: [
              {
                title: 'URL',
                name: 'href',
                type: 'url'
              }
            ]
          }
        ]
      }
    },
    {
      type: 'image'
    },
    {
      title: 'Inline Video',
      name: 'inlineVideo',
      type: 'object',
      fields: [
        {
          title: 'Video',
          name: 'video',
          type: 'mux.video'
        },
        {
          title: 'Caption',
          name: 'caption',
          type: 'string'
        }
      ]
    }
  ]
} 