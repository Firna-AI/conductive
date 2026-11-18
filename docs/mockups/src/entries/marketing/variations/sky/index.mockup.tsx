import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { SkyHomeScreen } from '../../../../screens/homeVariations/SkyHomeScreen'

export const marketingVariationSky = defineScreen({
  title: 'Variation A: Sky',
  description:
    'A proposal for the home page. The painted blue field of the share card fills the hero and the last call, and the app rises out of it. The features alternate sides, each on a stage in its own tint. The smaller features have tinted icon tiles.',
  rationale:
    'The share card already uses an approved blue field, so this variation brings the same colour to the page. The field mixes the accent into the surface, so it works in both colour schemes. The words, the order, and the pictures stay the same as on the current home page.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => <SkyHomeScreen viewport={context.viewport} />,
})
