export default {
  name: 'libraryPage',
  title: 'Library Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'Library',
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
      name: 'description',
      title: 'Description',
      type: 'blockContent',
      description: 'Introductory text for the Library page'
    },
    {
      name: 'references',
      title: 'References',
      type: 'array',
      description: 'List of external references and links',
      of: [
        {
          type: 'object',
          name: 'reference',
          title: 'Reference',
          fields: [
            {
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: Rule => Rule.required()
            },
            {
              name: 'url',
              title: 'URL',
              type: 'url',
              validation: Rule => Rule.required().uri({
                allowRelative: false,
                scheme: ['http', 'https']
              })
            },
            {
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 3,
              description: 'Optional brief description of this reference'
            }
          ],
          preview: {
            select: {
              title: 'title',
              url: 'url'
            },
            prepare(selection) {
              const { title, url } = selection
              return {
                title: title,
                subtitle: url
              }
            }
          }
        }
      ]
    }
  ],
  preview: {
    select: {
      title: 'title'
    },
    prepare(selection) {
      const { title } = selection
      return {
        title: title,
        subtitle: 'Library Page'
      }
    }
  }
}

