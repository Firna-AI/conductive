import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { parityStudyNote } from '../../../../fixtures/conductorParity'
import { FromConductorScreen } from '../../../../screens/FromConductorScreen'

export const fromConductorByArea = defineScreen({
  title: 'From Conductor, by area',
  description: `One of four layouts of the page for people who move from Conductor Cloud. An index of the areas and the legend come first. Then each area has a table with a row for each feature: its name, its status with its due date, and a note. A phone stacks the cells of each row. ${parityStudyNote}`,
  rationale:
    'The user chose on 9 November 2026: a page on the site from one typed data file, for Conductor Cloud users only, with several statuses and a firm date on some features. The layouts are design calls for a comparison. This one reads as a reference. A visitor finds one feature in its area and reads its status, its due date, and its note in one row. It is dense, and it puts the missing features beside the ones that work.',
  relatedDocs: ['docs/mockups/src/entries/marketing/from-conductor/index.md'],
  address: `${productDomain}/from-conductor`,
  props: {},
  render: (_props, context) => (
    <FromConductorScreen layout="by-area" viewport={context.viewport} />
  ),
})
