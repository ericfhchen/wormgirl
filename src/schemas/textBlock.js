export default {
  name: 'textBlock',
  title: 'Text Block',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'Title for this text block when displayed in tabs'
    },
    {
      name: 'icon',
      title: 'Section Icon',
      type: 'image',
      description: 'Icon to display next to the section title in tabs (SVG or PNG recommended)'
    },
    {
      name: 'content',
      title: 'Content',
      type: 'blockContent'
    }
  ],
  preview: {
    select: {
      title: 'title',
      content: 'content'
    },
    prepare(selection) {
      const { title, content } = selection
      
      if (title) {
        return {
          title: title,
          subtitle: 'Text Block'
        }
      }
      
      const block = (content || []).find(block => block._type === 'block')
      return {
        title: block
          ? block.children
              .filter(child => child._type === 'span')
              .map(span => span.text)
              .join('')
          : 'Text Block',
        subtitle: 'Text Block'
      }
    }
  }
} 