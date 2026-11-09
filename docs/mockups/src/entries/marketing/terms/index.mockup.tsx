import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { LegalScreen } from '../../../screens/LegalScreen'

export const terms = defineScreen({
  title: 'Terms of use',
  description:
    'The terms of use of the site, with the operator details and service rules. The footer, the sign-in screen, and the page before GitHub link here.',
  rationale:
    'Each user accepts the current terms at sign-in. The terms pass on the rules of acceptable use of the providers, name an address for abuse reports, and explain account suspension. The text comes from the document that the site serves, so the mockup and the site show the same words. No text names the cloud computer provider.',
  relatedDocs: [],
  address: `${productDomain}/terms`,
  props: {},
  render: (_props, context) => (
    <LegalScreen page="terms" viewport={context.viewport} />
  ),
})
