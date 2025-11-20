export default {
  name: 'projectSection',
  title: 'Project Section',
  type: 'object',
  fields: [
    {
      name: 'title',
      title: 'Section Title',
      type: 'string',
      description: 'Optional title for this section of projects'
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
      description: 'Select projects to display in this section'
    },
    {
      name: 'displayMode',
      title: 'Display Mode',
      type: 'string',
      options: {
        list: [
          { title: 'Grid', value: 'grid' },
          { title: 'List', value: 'list' },
          { title: 'Carousel', value: 'carousel' }
        ]
      },
      initialValue: 'grid',
      description: 'How to display the projects'
    },
    {
      name: 'filterByCategory',
      title: 'Filter by Category',
      type: 'string',
      options: {
        list: [
          { title: 'All', value: 'all' },
          { title: 'Feature', value: 'feature' },
          { title: 'Installation', value: 'installation' },
          { title: 'Project', value: 'project' },
          { title: 'Exhibition', value: 'exhibition' },
          { title: 'Performance', value: 'performance' },
          { title: 'Other', value: 'other' }
        ]
      },
      initialValue: 'all',
      description: 'Optionally filter projects by category'
    }
  ],
  preview: {
    select: {
      title: 'title',
      projects: 'projects',
      displayMode: 'displayMode'
    },
    prepare(selection) {
      const { title, projects, displayMode } = selection
      const projectCount = projects ? projects.length : 0
      return {
        title: title || 'Project Section',
        subtitle: `${projectCount} project${projectCount !== 1 ? 's' : ''} • ${displayMode || 'grid'} view`
      }
    }
  }
}

