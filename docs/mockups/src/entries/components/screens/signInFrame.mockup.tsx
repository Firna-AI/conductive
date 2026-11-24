import { defineComponent } from '@mokly/mokly'
import { updateAppCopy } from '../../../components/phone/appStopCopy'
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
    'The page of the app before the app opens, for the sign-in, the sign-in of a join link, and the waitlist: the wordmark, one card in the middle, and the legal links at the foot. It stands alone, without the rail. A phone draws the card without its outline. In the Mac app the header is the top bar of the window. In a phone app the wordmark is no link, and the foot has only the legal links, which open the legal pages of the app host in the in-app browser. A page that stops a phone app has no foot. A screen supplies the card, so its own page shows an empty card.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md', 'docs/mockups/phone-app.md'],
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
      /** The page of a phone app, which links to no page of the site. */
      phoneApp: { type: 'boolean' },
      /** A page without a foot, such as a page that stops a phone app. */
      bare: { type: 'boolean' },
      /**
       * Where the legal links of the foot lead: the pages of a phone app,
       * or `still` for links that keep their look and open nothing.
       * Without it, they open the legal pages of the site.
       */
      legal: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: ['terms', 'privacy'],
            properties: {
              terms: { type: 'string' },
              privacy: { type: 'string' },
            },
          },
          { const: 'still' },
        ],
      },
    },
  } as const,
  slots: ['children'],
  props: { label: signInCopy.title },
  render: (props, context) => (
    <SignInFrame
      bare={props.bare}
      label={props.label}
      legal={props.legal}
      phoneApp={props.phoneApp}
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
    {
      slug: 'phone-app',
      title: 'Phone app',
      description:
        'The page in a phone app, with the words of the sign-in. The wordmark is no link, and the foot has only the legal links, because a phone app links to no page of the site. On the start of the phone sign-in, they open Terms and Privacy on the app host in the in-app browser. Done of those pages shows the start, so this page shows the links with no destination.',
      props: {
        label: signInCopy.title,
        legal: 'still',
        phoneApp: true,
      },
      slots: {
        children: (
          <>
            <h1>{signInCopy.title}</h1>
            <p>{signInCopy.text}</p>
          </>
        ),
      },
    },
    {
      slug: 'phone-app-bare',
      title: 'Phone app, no foot',
      description:
        'A page that stops a phone app until the person acts, with the words of Update the app. It has no foot.',
      props: { bare: true, label: updateAppCopy.title, phoneApp: true },
      slots: {
        children: (
          <>
            <h1>{updateAppCopy.title}</h1>
            <p>{updateAppCopy.text}</p>
          </>
        ),
      },
    },
  ],
})
