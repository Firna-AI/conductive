import { defineComponent } from '@mokly/mokly'
import { SignInFrame } from '../../../screens/signInFrame'
import { signInCopy } from '../../../../../../src/ui/screens/signInCopy'
import { waitlistCopy } from '../../../../../../src/ui/screens/waitlistCopy'
import { viewports } from '../common/viewports'

/**
 * The page of the app before the app opens, registered with Mokly. A
 * screen supplies the content of its card in the `children` slot. A screen
 * that draws a screen of another viewport passes `viewport`. Without it, a
 * page of the frame draws the layout of its own view.
 */
export const signInFrame = defineComponent({
  slug: 'sign-in-frame',
  title: 'Sign-in frame',
  description:
    'The page of the app before the app opens, for the sign-in, the sign-in of a join link, and the waitlist: the wordmark, one card in the middle, and the legal links at the foot. It stands alone, without the rail. A phone draws the card without its outline. In the Mac app the header is the top bar of the window. A screen supplies the card, so its own page shows an empty card.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['label'],
    properties: {
      /** The name of the card, for assistive technology. */
      label: { type: 'string' },
      /** The viewport of the screen, when it differs from the view. */
      viewport: { enum: viewports },
      /** A wider card, for a list or a field with its button. */
      wide: { type: 'boolean' },
    },
  } as const,
  slots: ['children'],
  props: { label: signInCopy.title },
  render: (props, context) => (
    <SignInFrame
      label={props.label}
      viewport={props.viewport ?? context.viewport}
      wide={props.wide}
    >
      {props.children}
    </SignInFrame>
  ),
  variants: [
    {
      slug: 'wide',
      title: 'Wide card',
      description: 'The wider card of the waitlist, with its words.',
      props: { label: waitlistCopy.title, wide: true },
      slots: {
        children: (
          <>
            <h1>{waitlistCopy.title}</h1>
            <p>{waitlistCopy.noEmail}</p>
          </>
        ),
      },
    },
  ],
})
