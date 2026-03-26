import React from 'react'

// Small Caps icon component for the toolbar
const SmallCapsIcon = () => React.createElement('span', {
  style: {
    fontSize: '12px',
    fontWeight: '600',
    fontVariant: 'small-caps',
    letterSpacing: '0.5px',
  },
  title: 'Small Caps'
}, 'SC')

// Small Caps render component for the editor preview
const SmallCapsRender = (props) => React.createElement('span', {
  style: { fontVariant: 'small-caps' }
}, props.children)

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
        {title: 'Indent', value: 'indent'},
        {title: 'Quote 2', value: 'quote2'},
      ],
      lists: [
        {title: 'Bullet', value: 'bullet'},
        {title: 'Numbered', value: 'number'}
      ],
      marks: {
        decorators: [
          {title: 'Strong', value: 'strong'},
          {title: 'Emphasis', value: 'em'},
          {
            title: 'Small Caps',
            value: 'smallCaps',
            icon: SmallCapsIcon,
            component: SmallCapsRender,
          },
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
                type: 'url',
                validation: Rule => Rule.uri({
                  allowRelative: false,
                  scheme: ['http', 'https', 'mailto', 'tel']
                })
              }
            ]
          }
        ]
      }
    },
    {
      type: 'image',
      fields: [
        {
          name: 'caption',
          title: 'Caption',
          type: 'string',
          description: 'Optional caption that will appear below the image'
        }
      ]
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
    },
    {
      title: 'Spotify Embed',
      name: 'spotifyEmbed',
      type: 'object',
      fields: [
        {
          title: 'Spotify URL',
          name: 'url',
          type: 'url',
          description: 'Full Spotify URL (e.g., https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd)',
          validation: Rule => Rule.required().uri({
            allowRelative: false,
            scheme: ['https']
          }).custom((url) => {
            if (url && !url.includes('spotify.com')) {
              return 'Must be a Spotify URL'
            }
            return true
          })
        },
        {
          title: 'Height',
          name: 'height',
          type: 'number',
          description: 'Height of the embed in pixels (default: 380)',
          initialValue: 380,
          validation: Rule => Rule.min(200).max(800)
        }
      ],
      preview: {
        select: {
          url: 'url'
        },
        prepare(selection) {
          const { url } = selection
          return {
            title: 'Spotify Embed',
            subtitle: url || 'No URL set'
          }
        }
      }
    }
  ]
} 