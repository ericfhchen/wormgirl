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
      options: {
        list: [
          { title: 'Feature', value: 'feature' },
          { title: 'Installation', value: 'installation' },
          { title: 'Project', value: 'project' },
          { title: 'Exhibition', value: 'exhibition' },
          { title: 'Performance', value: 'performance' },
          { title: 'Other', value: 'other' }
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Display order for this project'
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
        subtitle: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'No category set',
        media: media
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
    },
    {
      title: 'Category',
      name: 'categoryAsc',
      by: [
        {field: 'category', direction: 'asc'},
        {field: 'order', direction: 'asc'}
      ]
    }
  ]
}

