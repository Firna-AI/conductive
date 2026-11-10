import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { LegalScreen } from '../../../screens/LegalScreen'

export const privacy = defineScreen({
  title: 'Privacy notice',
  description:
    'The privacy notice of the site, with the operator details and a section for each piece of privacy information. The footer, the sign-in screen, and the page before GitHub link here.',
  rationale:
    'The sections follow the privacy information that the ICO guidance lists. The text comes from the document that the site serves, so the mockup and the site show the same words. No text names the cloud computer provider.',
  relatedDocs: [],
  address: `${productDomain}/privacy`,
  props: {},
  render: (_props, context) => (
    <LegalScreen page="privacy" viewport={context.viewport} />
  ),
})
