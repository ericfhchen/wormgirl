export default {
  name: 'textBlock',
  title: 'Text Block',
  type: 'object',
  fields: [
    {
      name: 'content',
      title: 'Content',
      type: 'blockContent'
    }
  ],
  preview: {
    select: {
      content: 'content'
    },
    prepare(selection) {
      const { content } = selection
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