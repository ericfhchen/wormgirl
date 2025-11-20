export default {
  name: 'contentPage',
  title: 'Content Page',
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
      name: 'pageType',
      title: 'Page Type',
      type: 'string',
      options: {
        list: [
          { title: 'Text', value: 'text' },
          { title: 'Works', value: 'works' }
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      of: [
        { type: 'categorySection' },
        { type: 'textBlock' },
        { type: 'projectSection' }
      ],
      description: 'Flexible layout sections for this page'
    }
  ],
  preview: {
    select: {
      title: 'title',
      pageType: 'pageType'
    },
    prepare(selection) {
      const { title, pageType } = selection
      return {
        title: title,
        subtitle: pageType ? pageType.charAt(0).toUpperCase() + pageType.slice(1) : 'No type set'
      }
    }
  }
} 