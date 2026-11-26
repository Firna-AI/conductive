import { defineComponent } from '@mokly/mokly'
import {
  LoginNotUsable,
  SignedOutStatus,
} from '../../../components/settings/LoginNotUsable'
import { codexUnusableCause } from '../../../fixtures/logins'
import { paths } from '../../../paths'

/** The state of a login that the app can no longer use, registered with Mokly. */
export const signedOutStatus = defineComponent({
  slug: 'signed-out-status',
  title: 'Signed out status',
  description:
    'Signed out, in rose, in the row of a connected login that the app can no longer use, in place of Connected.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {},
  } as const,
  render: () => <SignedOutStatus />,
})

/**
 * The cause of a login that the app can no longer use, with Sign in again,
 * registered with Mokly.
 */
export const loginNotUsable = defineComponent({
  slug: 'login-not-usable',
  title: 'Login not usable',
  description:
    'The cause under the row of a login that the app can no longer use, such as a ChatGPT sign-in that OpenAI did not renew, then Sign in again, which opens the form of its sign-in and lines up with Remove. Its own page shows the expired ChatGPT access of Codex.',
  relatedDocs: ['docs/mockups/orgs-and-logins.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['cause', 'signInTo'],
    properties: {
      /** The cause, from the field `unusableCause` of the login status. */
      cause: { type: 'string' },
      /** The screen that Sign in again opens. */
      signInTo: { type: 'string', minLength: 1 },
    },
  } as const,
  props: { cause: codexUnusableCause, signInTo: paths.codexSignInAgain },
  render: (props) => (
    <LoginNotUsable cause={props.cause} signInTo={props.signInTo} />
  ),
})
