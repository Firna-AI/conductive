import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { BentoHomeScreen } from '../../../../screens/homeVariations/BentoHomeScreen'

export const marketingVariationBento = defineScreen({
  title: 'Variation B: Bento',
  description:
    'A proposal for the home page. A large centred headline ends in a gradient, and a glow of the accent sits behind the app. Every feature is a tile of one grid, in two sizes that change sides on each row, and each picture runs off the edge of its tile. The Mac app spans the full row with its downloads.',
  rationale:
    'A grid of tiles shows all the features at a glance and gives each one its own shape, where the current page repeats one layout seven times. The words, the order, and the pictures stay the same as on the current home page.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => <BentoHomeScreen viewport={context.viewport} />,
})
