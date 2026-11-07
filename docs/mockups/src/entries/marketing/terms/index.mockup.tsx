import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { LegalScreen } from '../../../screens/LegalScreen'

export const terms = defineScreen({
  title: 'Terms of use',
  description:
    'The terms of use of the site, as a draft for lawyer review: the notice of the draft, then the sections, with each fact that waits for the operator marked. The footer, the sign-in screen, and the page before GitHub link here.',
  rationale:
    'The user chose option A of decision 35: Terms and Privacy pages, which a lawyer reviews before the app opens to other people. Each user accepts the terms at sign-up, and the terms pass on the rules of acceptable use of the providers, name an address for abuse reports, and say how the operator suspends an account, as the user chose with option D of decision 28. The text comes from the document that the site serves, so the mockup and the site show the same words. No text names the cloud computer provider.',
  relatedDocs: [],
  address: `${productDomain}/terms`,
  props: {},
  render: (_props, context) => (
    <LegalScreen page="terms" viewport={context.viewport} />
  ),
})
