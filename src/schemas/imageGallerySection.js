export default {
  name: 'imageGallerySection',
  title: 'Image Gallery Section',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'Gallery Title',
      type: 'string'
    },
    {
      name: 'icon',
      title: 'Section Icon',
      type: 'image',
      description: 'Icon to display next to the section title in tabs (SVG or PNG recommended)'
    },
    {
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'image',
              title: 'Image',
              type: 'image',
              validation: Rule => Rule.required()
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string'
            },
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'Important for accessibility'
            }
          ],
          preview: {
            select: {
              title: 'caption',
              subtitle: 'alt',
              media: 'image'
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
        title: title || 'Image Gallery',
        subtitle: 'Image Gallery Section'
      }
    }
  }
} 