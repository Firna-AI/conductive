import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { LegalScreen } from '../../../screens/LegalScreen'

export const privacy = defineScreen({
  title: 'Privacy notice',
  description:
    'The privacy notice of the site, as a draft for lawyer review: the notice of the draft, then a section for each piece of privacy information, with each fact that waits for the operator marked. The footer, the sign-in screen, and the page before GitHub link here.',
  rationale:
    'The user chose option A of decision 35: Terms and Privacy pages, which a lawyer reviews before the app opens to other people. The sections follow the privacy information that the ICO guidance lists. The text comes from the document that the site serves, so the mockup and the site show the same words. No text names the cloud computer provider.',
  relatedDocs: [],
  address: `${productDomain}/privacy`,
  props: {},
  render: (_props, context) => (
    <LegalScreen page="privacy" viewport={context.viewport} />
  ),
})
