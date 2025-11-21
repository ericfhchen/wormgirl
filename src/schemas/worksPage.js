export default {
  name: 'worksPage',
  title: 'Works Page',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Works',
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
      name: 'projects',
      title: 'Projects',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'project' }]
        }
      ],
      description: 'Select and order projects to display on the Works page. Drag to reorder.',
      options: {
        sortable: true
      }
    }
  ],
  preview: {
    select: {
      title: 'title',
      projects: 'projects'
    },
    prepare(selection) {
      const { title, projects } = selection
      const projectCount = projects ? projects.length : 0
      return {
        title: title,
        subtitle: `${projectCount} project${projectCount !== 1 ? 's' : ''}`
      }
    }
  }
}

