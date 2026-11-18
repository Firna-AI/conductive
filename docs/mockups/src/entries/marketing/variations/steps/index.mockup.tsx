import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { StepsHomeScreen } from '../../../../screens/homeVariations/StepsHomeScreen'

export const marketingVariationSteps = defineScreen({
  title: 'Variation C: Steps',
  description:
    'A proposal for the home page. The page follows one task. The hero lists the steps beside the headline. The first four features are numbered steps on a rail, from the cloud computer to the terminal. The org, the phone, and the Mac app follow as cards around the work.',
  rationale:
    'A sequence explains how the product works, not only what it has. It uses the order of the current features, so it needs no new claims. The words and the pictures stay the same as on the current home page.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => <StepsHomeScreen viewport={context.viewport} />,
})
