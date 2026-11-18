import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { EditorialHomeScreen } from '../../../../screens/homeVariations/EditorialHomeScreen'

export const marketingVariationEditorial = defineScreen({
  title: 'Variation D: Editorial',
  description:
    'A proposal for the home page. A very large headline sits over the app, which leans back and fades out. A line of large feature names follows. Each feature then fills one band across the page, and every second band turns to the ink colour. The smaller features are a numbered list.',
  rationale:
    'Very large type and full-width bands give the page a strong rhythm without new colours, so it stays close to the graphite look of the app. The words, the order, and the pictures stay the same as on the current home page.',
  relatedDocs: [],
  address: productDomain,
  props: {},
  render: (_props, context) => (
    <EditorialHomeScreen viewport={context.viewport} />
  ),
})
