import { defineComponent } from '@mokly/mokly'
import { ToastLayer } from '../../../components/common/ToastLayer'
import { noop } from '../../../../../../src/ui/noop'

/**
 * The parts of a Firna toast that the screens give, as JSON. The action of
 * a toast keeps its label, and its adapter passes `noop` as its handler.
 */
const toastSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    tone: { enum: ['error', 'info', 'success', 'warning'] },
    action: {
      type: 'object',
      additionalProperties: false,
      required: ['label'],
      properties: { label: { type: 'string' } },
    },
  },
} as const

/** Whether the toast sits across a phone screen. */
export const phoneSchema = { type: 'boolean' } as const

/**
 * A toast of the app, drawn open where the app shows its toasts, registered
 * with Mokly. A screen that draws a screen of another viewport passes
 * `phone`. Without it, a page of the toast draws the layout of its view.
 */
export const toastLayer = defineComponent({
  slug: 'toast-layer',
  title: 'Toast layer',
  description:
    'A toast of the app, drawn open where the app shows its toasts: at the bottom right of the window, and across the bottom of a phone screen. It is the toast of Firna, and it stays until the person closes it. Its own page shows a toast that confirms a change.',
  relatedDocs: ['docs/mockups/design.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['toast'],
    properties: { toast: toastSchema, phone: phoneSchema },
  } as const,
  props: { toast: { title: 'Copied the transcript.', tone: 'success' } },
  render: (props, context) => {
    const { action, ...toast } = props.toast
    return (
      <ToastLayer
        phone={props.phone ?? context.viewport === 'mobile'}
        toast={
          action === undefined
            ? toast
            : { ...toast, action: { label: action.label, onPress: noop } }
        }
      />
    )
  },
  variants: [
    {
      slug: 'error',
      title: 'Failure',
      description: 'A change that failed, with the message of the server.',
      props: {
        toast: {
          title: "The workspace wasn't renamed.",
          description: "The app can't reach the server.",
          tone: 'error',
        },
      },
    },
    {
      slug: 'action',
      title: 'With an action',
      description: 'A toast with an action, such as Restore after Archive.',
      props: {
        toast: {
          title: 'Saved carts is archived.',
          tone: 'success',
          action: { label: 'Restore' },
        },
      },
    },
  ],
})
