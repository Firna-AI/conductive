import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../brand'
import { NotFoundScreen } from '../../../screens/NotFoundScreen'

export const notFound = defineScreen({
  title: 'Page not found',
  description:
    'The page of the site for an address that it does not have, with the header and the footer of the site and a link to the home page.',
  rationale:
    'The site answers every unknown address with this page and the status 404, so the API and the files of the app never answer on the root domain. It keeps the header and the footer, so a visitor can go on from there. The words come from the text that the site serves.',
  relatedDocs: [],
  address: `${productDomain}/old-page`,
  props: {},
  render: (_props, context) => <NotFoundScreen viewport={context.viewport} />,
})
