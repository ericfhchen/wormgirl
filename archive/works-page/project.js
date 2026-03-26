export default {
  name: 'project',
  title: 'Project',
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
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'E.g., feature, installation, project, etc.',
      validation: Rule => Rule.required()
    },
    {
      name: 'projectDetails',
      title: 'Project Details',
      type: 'blockContent',
      description: 'Rich text for project details (title, year, location, client, etc.)'
    },
    {
      name: 'imageCarousel',
      title: 'Image Carousel',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true
          },
          fields: [
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional caption for this image'
            },
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'Alternative text for accessibility'
            }
          ]
        }
      ],
      description: 'Multiple images for the project carousel'
    },
    {
      name: 'projectDescription',
      title: 'Project Description',
      type: 'blockContent',
      description: 'Longer text, links to press, documentation, etc.'
    },
    {
      name: 'projectLinks',
      title: 'Project Links',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Link Label',
              type: 'string',
              description: 'Text to display for the link',
              validation: Rule => Rule.required()
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url',
              description: 'Full URL (e.g., https://example.com)',
              validation: Rule => Rule.required().uri({
                allowRelative: false,
                scheme: ['http', 'https', 'mailto', 'tel']
              })
            }
          ],
          preview: {
            select: {
              label: 'label',
              url: 'url'
            },
            prepare(selection) {
              const { label, url } = selection
              return {
                title: label || 'Untitled Link',
                subtitle: url || 'No URL set'
              }
            }
          }
        }
      ],
      description: 'Additional links (press, documentation, etc.) displayed below the description'
    }
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      media: 'imageCarousel.0'
    },
    prepare(selection) {
      const { title, category, media } = selection
      return {
        title: title,
        subtitle: category || 'No category set',
        media: media
      }
    }
  },
  orderings: [
    {
      title: 'Category',
      name: 'categoryAsc',
      by: [
        {field: 'category', direction: 'asc'}
      ]
    }
  ]
}

