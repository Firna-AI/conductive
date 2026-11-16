import { defineComponent } from '@mokly/mokly'
import { SessionLoginLabel } from '../../../components/chat/SessionLogin'

/**
 * The label of the login of another member in the composer, registered
 * with Mokly. The app draws the same label, so mockup-only parts render
 * the wrapper.
 */
export const sessionLoginLabel = defineComponent({
  slug: 'session-login-label',
  title: 'Session login label',
  description:
    'The label in the bar of the composer, after the model picker, that names the login of another member that a message spends, such as "Cal\'s login". It sits inside the box, so the box keeps its place and its height.',
  relatedDocs: ['docs/mockups/own-endpoint-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['starter'],
    properties: {
      /** The name of the starter of the session. */
      starter: { type: 'string' },
    },
  } as const,
  props: { starter: 'Cal' },
  render: (props) => <SessionLoginLabel starter={props.starter} />,
})
