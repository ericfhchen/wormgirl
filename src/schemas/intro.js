export default {
  name: 'intro',
  title: 'Intro Settings',
  type: 'document',
  fields: [
    {
      name: 'idleVideo',
      title: 'Idle Video',
      type: 'mux.video',
      description: 'Video clip that loops on the landing page intro.'
    },
    {
      name: 'buttonLabel',
      title: 'Button Label',
      type: 'string',
      description: 'Label for the intro button (default "PRELUDE")',
      initialValue: 'PRELUDE'
    }
  ],
  preview: {
    select: {
      title: 'buttonLabel'
    },
    prepare(selection) {
      const { title } = selection
      return {
        title: `Intro Settings – ${title || 'PRELUDE'}`
      }
    }
  }
} 