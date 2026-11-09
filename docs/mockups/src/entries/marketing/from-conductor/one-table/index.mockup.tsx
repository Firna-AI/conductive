import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { parityStudyNote } from '../../../../fixtures/conductorParity'
import { FromConductorScreen } from '../../../../screens/FromConductorScreen'

export const fromConductor = defineScreen({
  title: 'Comparison page',
  description: `The page for people who move from Conductor Cloud. Its top says that the list covers Conductor Cloud features only. The legend comes next, then one table with one header and a group of rows for each area, in the order of the areas. Each row holds a feature: its name, its status with its due date, and a note. On a computer, each area is one cell that spans the rows of its features, with its name at the top. Only the darker hairline at the end of the area crosses that cell, and the other columns keep a hairline under each feature. A phone stacks the cells of each row, with the area on top. The home page links here from a short link above its headline, and the footer of the site links here from its Product column. ${parityStudyNote}`,
  rationale:
    'The user chose this layout on 9 November 2026, after a comparison with a table for each area, a board by status, and a guide by task, and removed the other three. The user chose the colours of three statuses on the same day: red for Not planned, amber for In progress, and green for Works differently. Each status keeps its word and its icon, so its colour only supports it. The page covers Conductor Cloud users only, with several statuses and a firm date on some features, as the user chose.',
  relatedDocs: ['docs/mockups/src/entries/marketing/from-conductor/index.md'],
  address: `${productDomain}/from-conductor`,
  props: {},
  render: (_props, context) => (
    <FromConductorScreen viewport={context.viewport} />
  ),
})
