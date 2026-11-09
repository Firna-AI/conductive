import { defineScreen } from '@mokly/mokly'
import { productDomain } from '../../../../brand'
import { parityStudyNote } from '../../../../fixtures/conductorParity'
import {
  FromConductorScreen,
  taskLayoutSchema,
} from '../../../../screens/FromConductorScreen'

export const fromConductorByTask = defineScreen({
  title: 'From Conductor, by task',
  description: `Layout C of three for the page for people who move from Conductor Cloud. Each job that a Conductor Cloud user does has a card: one sentence, the count of each status, and what is on the way with its due date. Every card starts closed. A native disclosure opens its features, with no script. The legend comes last. ${parityStudyNote}`,
  rationale:
    'The user chose on 9 November 2026: a page on the site from one typed data file, for Conductor Cloud users only, with several statuses and a firm date on some features. The three layouts are design calls for a comparison. This one is the shortest to skim: each card answers in one sentence and keeps its features closed. Each sentence is written by hand, so it can go out of date when a status changes.',
  relatedDocs: ['docs/mockups/src/entries/marketing/from-conductor/index.md'],
  address: `${productDomain}/from-conductor`,
  propSchema: taskLayoutSchema,
  props: { open: 'none' },
  render: (props, context) => (
    <FromConductorScreen
      layout="by-task"
      open={props.open}
      viewport={context.viewport}
    />
  ),
  variants: [
    {
      slug: 'open',
      title: 'A card open',
      description: `The task layout after a visitor opens the card Work with agents. It lists the five features of the card, each with its status, its due date, and its note. While the card is open, it hides its summary of what is on the way, because the list repeats it. ${parityStudyNote}`,
      props: { open: 'agents' },
    },
  ],
})
