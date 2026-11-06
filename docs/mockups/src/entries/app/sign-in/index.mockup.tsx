import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../brand'
import { SignInScreen } from '../../../screens/SignInScreen'

export const signIn = defineScreen({
  title: 'Sign in',
  description:
    'The GitHub sign-in of the app, at the app subdomain. Continue with GitHub signs in a user, and signs up a new one. The two actions of the home page lead here.',
  rationale:
    'GitHub is the only way in, as the user decided, and sign-up is open to every GitHub account (decision 48). The GitHub App also signs the user in, so one GitHub step gives both the identity and the repository access. The page names no plan. It stands alone, without the rail, because nobody is signed in yet. The links to Terms and Privacy follow decision 35 A. Their pages are not drawn yet.',
  relatedDocs: [],
  address: appDomain,
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => <SignInScreen viewport={context.viewport} />,
})
