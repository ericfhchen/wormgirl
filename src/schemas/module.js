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
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Brief description for sidebar display'
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