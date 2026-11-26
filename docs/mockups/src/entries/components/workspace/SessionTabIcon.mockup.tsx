import { defineComponent } from '@mokly/mokly'
import { SessionTabIcon } from '../../../../../../src/ui/components/workspace/SessionTabIcon'

/** The icon of the tab of a session, registered with Mokly. */
export const sessionTabIcon = defineComponent({
  slug: 'session-tab-icon',
  title: 'Session tab icon',
  description:
    'The icon of the tab of a session: a chat bubble, a spinner while its agent works, or a needs-input mark while a request is open. The app shares it. Its own page shows the tab of an idle session.',
  relatedDocs: ['docs/mockups/design-workspace.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['running'],
    properties: {
      /** The agent of the session works. */
      running: { type: 'boolean' },
      /** The session holds an open request. */
      needsInput: { type: 'boolean' },
    },
  } as const,
  props: { running: false },
  render: (props) => (
    <SessionTabIcon needsInput={props.needsInput} running={props.running} />
  ),
  variants: [
    {
      slug: 'running',
      title: 'Working',
      description: 'The agent of the session works: a spinner.',
      props: { running: true },
    },
  ],
})
