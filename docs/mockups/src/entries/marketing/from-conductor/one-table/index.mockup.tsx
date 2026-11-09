import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { parityStudyNote } from '../../../../fixtures/conductorParity'
import { FromConductorScreen } from '../../../../screens/FromConductorScreen'

export const fromConductorOneTable = defineScreen({
  title: 'From Conductor, one table',
  description: `One of four layouts of the page for people who move from Conductor Cloud: the rows of the area layout in one table. The legend comes first. Then one header heads a row for each feature, in the order of the areas: its area, its name, its status with its due date, and a note. The area shows on the first row of each area, and a darker hairline ends each area. A phone stacks the cells of each row, with the area on top. ${parityStudyNote}`,
  rationale:
    'The user chose on 9 November 2026: a page on the site from one typed data file, for Conductor Cloud users only, with several statuses and a firm date on some features. Then the user asked for a layout like by area, but as one big table. The Area column is a design call of the parent session: it keeps the areas in view without headings or separate tables. A visitor reads every feature in one run and compares the statuses down one column.',
  relatedDocs: ['docs/mockups/src/entries/marketing/from-conductor/index.md'],
  address: `${productDomain}/from-conductor`,
  props: {},
  render: (_props, context) => (
    <FromConductorScreen layout="one-table" viewport={context.viewport} />
  ),
})
