import { defineComponent } from '@mokly/mokly'
import { SuccessToast } from '../../../components/common/SuccessToast'
import { phoneSchema } from './ToastLayer.mockup'

/**
 * The toast that confirms a change that went through, registered with
 * Mokly. A screen that draws a screen of another viewport passes `phone`.
 */
export const successToast = defineComponent({
  slug: 'success-toast',
  title: 'Success toast',
  description:
    'The toast that confirms a change that went through, such as a sent feedback message: at the bottom right of the window, and at the bottom of a phone screen. Its own page shows sent feedback.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: { title: { type: 'string' }, phone: phoneSchema },
  } as const,
  props: { title: 'Thanks for your feedback' },
  render: (props, context) => (
    <SuccessToast
      phone={props.phone ?? context.viewport === 'mobile'}
      title={props.title}
    />
  ),
})
