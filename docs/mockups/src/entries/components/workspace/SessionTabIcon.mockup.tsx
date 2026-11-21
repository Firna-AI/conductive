import { defineComponent } from '@mokly/mokly'
import { SessionTabIcon } from '../../../components/workspace/SessionTabIcon'

/** The icon of the tab of a session, registered with Mokly. */
export const sessionTabIcon = defineComponent({
  slug: 'session-tab-icon',
  title: 'Session tab icon',
  description:
    'The icon of the tab of a session: a chat bubble, or a spinner while its agent works. The app shares it. Its own page shows the tab of a session whose agent does not work.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['running'],
    properties: {
      /** The agent of the session works. */
      running: { type: 'boolean' },
    },
  } as const,
  props: { running: false },
  render: (props) => <SessionTabIcon running={props.running} />,
  variants: [
    {
      slug: 'running',
      title: 'Working',
      description: 'The agent of the session works: a spinner.',
      props: { running: true },
    },
  ],
})
