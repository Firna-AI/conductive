import { defineScreen } from '@mokly/mokly'
import {
  RoutinesScreen,
  routinesSchema,
} from '../../../../screens/RoutinesScreen'

export const emptyRoutines = defineScreen({
  title: 'No routines yet',
  description:
    'An org without routines. The page says what a routine does, and New routine starts the first one.',
  rationale:
    'The empty state names the outcome and has one action, so the header has no second New routine.',
  relatedDocs: [],
  propSchema: routinesSchema,
  props: { list: 'empty', org: 'active' },
  render: (props, context) => (
    <RoutinesScreen state={props} viewport={context.viewport} />
  ),
})
