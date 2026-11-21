import { defineComponent } from '@mokly/mokly'
import { FailureToast } from '../../../components/common/FailureToast'
import { phoneSchema } from './ToastLayer.mockup'

/**
 * The toast that names a change that failed, registered with Mokly. A
 * screen that draws a screen of another viewport passes `phone`.
 */
export const failureToast = defineComponent({
  slug: 'failure-toast',
  title: 'Failure toast',
  description:
    'The toast that names a change that failed, such as a change of the list, with the message of the server: at the bottom right of the window, and at the bottom of a phone screen. Its own page shows a rename that failed.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'message'],
    properties: {
      title: { type: 'string' },
      /** The message of the server. */
      message: { type: 'string' },
      phone: phoneSchema,
    },
  } as const,
  props: {
    title: "The workspace wasn't renamed.",
    message:
      "The app can't reach the server. Check the connection, then try again.",
  },
  render: (props, context) => (
    <FailureToast
      message={props.message}
      phone={props.phone ?? context.viewport === 'mobile'}
      title={props.title}
    />
  ),
})
