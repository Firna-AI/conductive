import { defineScreen } from '@mokly/mokly'
import {
  AutomationsScreen,
  automationsSchema,
} from '../../../../screens/AutomationsScreen'

export const emptyAutomations = defineScreen({
  title: 'No automations yet',
  description:
    'An org without automations. The page says what an automation does, and New automation starts the first one.',
  rationale:
    'The empty state names the outcome and has one action, so the header has no second New automation.',
  relatedDocs: [],
  propSchema: automationsSchema,
  props: { list: 'empty', org: 'active' },
  render: (props, context) => (
    <AutomationsScreen state={props} viewport={context.viewport} />
  ),
})
