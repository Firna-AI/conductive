import { defineScreen } from '@mokly/mokly'
import { MarketingScreen } from '../../screens/MarketingScreen'

export const marketing = defineScreen({
  title: 'Marketing site',
  description:
    'The marketing home page, public at the root of the app domain: a header with Sign in, a hero with the app, six features with real screens, the smaller features, a last call to action, and a footer.',
  rationale:
    'The page follows the calm structure of a Conductor-style home page: a short headline with one sentence, then large product pictures. Every picture is a real screen of this catalogue, laid out at its own size, scaled, and cropped, with its links and controls turned off, so a visitor stays on the page. Each claim is one that the plan decides. The page shows no customer logos, testimonials, user counts, certifications, desktop or native mobile app, API, other agents, changelog, or sandbox provider. The page shows no plans, because the product is free for now, as the user chose in decision 45. How the page states the price waits on decision 47. "Remote Code" is a working name.',
  relatedDocs: [],
  props: {},
  useCasePaths: ['user-flows/sign-up'],
  render: (_props, context) => <MarketingScreen viewport={context.viewport} />,
})
