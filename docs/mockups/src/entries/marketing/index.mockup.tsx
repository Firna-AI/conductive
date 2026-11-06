import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../brand'
import { MarketingScreen } from '../../screens/MarketingScreen'

export const marketing = defineScreen({
  title: 'Marketing site',
  description:
    'The marketing home page, public at the root of the product domain: a header with Sign in, a hero with the app, six features with real screens, the smaller features, a last call to action, and a footer. A line under each Start free with GitHub says that users need their own Boat account.',
  rationale:
    'The page follows the calm structure of a Conductor-style home page: a short headline with one sentence, then large product pictures. Every picture is a real screen of this catalogue, laid out at its own size, scaled, and cropped, with its links and controls turned off, so a visitor stays on the page. Each claim is one that the plan decides. The page shows no customer logos, testimonials, user counts, certifications, desktop or native mobile app, API, other agents, or changelog. The page shows no plans, because the product is free for now, as the user chose in decision 45. It keeps Start free with GitHub, and names Boat only to say that users need their own Boat account, which runs their cloud computers, as the user chose in decision 47. The product is "Conducting", on conducting.build, as the user chose in decision 32.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => <MarketingScreen viewport={context.viewport} />,
})
