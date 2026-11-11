import { defineScreen } from '@mokly/mokly'
import {
  RoutinesScreen,
  routinesSchema,
} from '../../../../../screens/RoutinesScreen'

export const suspendedRoutines = defineScreen({
  title: 'Routines of a suspended org',
  description:
    'Cal, an admin of Acme, opens Routines after the operator suspended Acme. The notice of the org is at the top. The routines show without New routine, and the last run of each shows the stop of the suspension.',
  rationale:
    'An org suspension takes away no access to read, so the Routines link stays in the sidebar and in the list of a phone. Nothing in a suspended org can change, also for an admin, so the page offers no action, as app/orgs/suspended/settings does. A suspended org starts no run. This page has a child page, so it shows only its canonical screen.',
  relatedDocs: [],
  propSchema: routinesSchema,
  props: { list: 'routines', org: 'suspended' },
  render: (props, context) => (
    <RoutinesScreen state={props} viewport={context.viewport} />
  ),
})
