import { defineScreen } from '@mokly/mokly'
import { SignInScreen, signInSchema } from '../../../screens/SignInScreen'

export const signIn = defineScreen({
  title: 'Sign in',
  description:
    'The GitHub sign-in of the app, at the app subdomain. Continue with GitHub signs in a user, and signs up a new one. The two actions of the home page lead here.',
  rationale:
    'GitHub is the only way in, as the user decided, and sign-up is open. The GitHub App also signs the user in, so one GitHub step gives both the identity and the repository access. The page names no plan, and it names the rule for new accounts only to an account that the rule refuses. It stands alone, without the rail, because nobody is signed in yet. The links to Terms, Privacy, Refunds and cancellation, and Contact wait on decision 35, drawn as its recommended option D. Their pages are not drawn yet.',
  relatedDocs: [],
  propSchema: signInSchema,
  props: { refusal: 'none' },
  useCasePaths: ['user-flows/sign-up'],
  render: (props, context) => (
    <SignInScreen state={props} viewport={context.viewport} />
  ),
})
