import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../brand'
import { SignInScreen } from '../../../screens/SignInScreen'

export const signIn = defineScreen({
  title: 'Sign in',
  description:
    'The GitHub sign-in of the app, at the app subdomain. Continue with GitHub signs in a user. A new person gets an account without app access, and the waitlist opens. Sign up and Sign in of the site lead here.',
  rationale:
    'GitHub is the only way in, as the user decided. Every GitHub account can sign up, and a new account waits for app access on the waitlist, as the user chose in decisions 160 and 161. The GitHub App also signs the user in, so one GitHub step gives both the identity and the repository access. The page names no plan. It stands alone, without the rail, because nobody is signed in yet. The links to Terms and Privacy follow decision 35 A.',
  relatedDocs: [],
  address: appDomain,
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => <SignInScreen viewport={context.viewport} />,
})
