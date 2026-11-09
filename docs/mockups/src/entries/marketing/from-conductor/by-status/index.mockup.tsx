import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { parityStudyNote } from '../../../../fixtures/conductorParity'
import { FromConductorScreen } from '../../../../screens/FromConductorScreen'

export const fromConductorByStatus = defineScreen({
  title: 'From Conductor, by status',
  description: `Layout B of three for the page for people who move from Conductor Cloud. Four counts link to four sections: what works today, what is on the way, what works differently, and what to do in place of a missing feature. Each feature on the way shows a leaf with its due date, or a dashed leaf without one. ${parityStudyNote}`,
  rationale:
    'The user chose on 9 November 2026: a page on the site from one typed data file, for Conductor Cloud users only, with several statuses and a firm date on some features. The three layouts are design calls for a comparison. This one answers first: it opens with what works today, then with what comes and when. It gives the clearest view of the due dates. To find one feature, a visitor reads several sections.',
  relatedDocs: ['docs/mockups/src/entries/marketing/from-conductor/index.md'],
  address: `${productDomain}/from-conductor`,
  props: {},
  render: (_props, context) => (
    <FromConductorScreen layout="by-status" viewport={context.viewport} />
  ),
})
