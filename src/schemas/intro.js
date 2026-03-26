export default {
  name: 'intro',
  title: 'Intro Settings',
  type: 'document',
  fields: [
    {
      name: 'video',
      title: 'Intro Video',
      type: 'mux.video',
      description: 'Full intro clip: camera zoom-in, then baked ping-pong loop at the end.'
    },
    {
      name: 'videoEndTimecode',
      title: 'Video End Timecode',
      type: 'string',
      description: 'Timecode of the last frame of the video (e.g. 00;00;15;02 at 30fps). The idle loop starts 3s before this. Format: HH;MM;SS;FF'
    },
    {
      name: 'buttonLabel',
      title: 'Button Label',
      type: 'string',
      description: 'Label for the intro button (default "PRELUDE")',
      initialValue: 'PRELUDE'
    },
    {
      name: 'idleVideo',
      title: 'Idle Video (legacy)',
      type: 'mux.video',
      description: 'Legacy idle clip. Use video + mainEnd instead.',
      hidden: true
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