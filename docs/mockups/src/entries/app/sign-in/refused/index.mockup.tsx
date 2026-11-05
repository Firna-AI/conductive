import { defineScreen } from '@mokly/mokly'
import { SignInScreen, signInSchema } from '../../../../screens/SignInScreen'

export const refused = defineScreen({
  title: 'Sign-up refused',
  description:
    'Back from GitHub, an account that is too new: it was created on 22 October, so it can sign up on 21 November, 30 days later. The page names the date and the rule.',
  rationale:
    'The user decided on 5 November 2026 that sign-up needs a GitHub account older than 30 days with a verified email. Decision 48 asks whether the check stays, now that each user runs cloud computers on their own account. A refusal names what failed and the fix, so the title gives the fix: the date, or the email to verify.',
  relatedDocs: [],
  propSchema: signInSchema,
  props: { refusal: 'too-new' },
  render: (props, context) => (
    <SignInScreen state={props} viewport={context.viewport} />
  ),
  variants: [
    {
      slug: 'email',
      title: 'No verified email',
      description:
        'The GitHub account has no verified email. The title names the fix, the link opens the email settings on GitHub, and Continue with GitHub tries again.',
      props: { refusal: 'unverified' },
    },
  ],
})
