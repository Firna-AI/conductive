import { defineComponent } from '@mokly/mokly'
import { SessionLoginLabel } from '../../../../../../src/ui/components/chat/SessionLogin'

/**
 * The label of the login of another member, or of the org login, in the
 * composer, registered with Mokly. The app draws the same label, so
 * mockup-only parts render the wrapper.
 */
export const sessionLoginLabel = defineComponent({
  slug: 'session-login-label',
  title: 'Session login label',
  description:
    'The label in the bar of the composer, after the model picker, that names a login that a message spends when it is not the own login of the member: the login of another member, such as "Cal\'s login", or the org login, such as "Acme\'s login". It sits inside the box, so the box keeps its place and its height.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['owner'],
    properties: {
      /** The name of the owner of the login: a member, or the org. */
      owner: { type: 'string' },
    },
  } as const,
  props: { owner: 'Cal' },
  render: (props) => <SessionLoginLabel owner={props.owner} />,
})
