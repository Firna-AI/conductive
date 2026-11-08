import { defineScreen } from '@mokly/mokly'
import { appDomain } from '../../../../brand'
import { TermsConsentScreen } from '../../../../screens/TermsConsentScreen'

export const signInTerms = defineScreen({
  title: 'Terms before GitHub',
  description:
    'The page that the app shows before GitHub when a sign-in starts without the agreement to the current terms, such as from the menu of the Mac app. Continue with GitHub agrees and goes on to GitHub.',
  rationale:
    'Each user accepts the terms at sign-up, as the user chose with option D of decision 28. The sign-in screen of the app shows the same agreement beside Continue with GitHub, so this page shows only when a sign-in starts elsewhere. The page runs no script, so it has the look of the pages of the site, with the words of the sign-in screen. Its links open the Terms and Privacy pages of the site.',
  relatedDocs: [],
  address: `${appDomain}/api/auth/github`,
  props: {},
  render: (_props, context) => (
    <TermsConsentScreen viewport={context.viewport} />
  ),
})
