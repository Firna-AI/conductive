import { defineScreen } from '@mokly/mokly'
import { SignInScreen } from '../../../screens/SignInScreen'

export const signIn = defineScreen({
  title: 'Sign in',
  description:
    'The GitHub sign-in of the app, at the app subdomain. Continue with GitHub signs in a user, and signs up a new one. The two actions of the home page lead here.',
  rationale:
    'GitHub is the only way in, as the user decided, and sign-up is open. The GitHub App also signs the user in, so one GitHub step gives both the identity and the repository access. The page names no plan and no rule for new accounts. It stands alone, without the rail, because nobody is signed in yet.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => <SignInScreen viewport={context.viewport} />,
})
