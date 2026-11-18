import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const adminAutomation = defineScreen({
  title: 'Seen by an admin',
  description:
    "Cal, an admin, reads Priya's weekly automation, which uses a Codex model. Turn off and Delete are the only actions.",
  rationale:
    'An admin can turn an automation off and delete it, from decision 502 B, but cannot change it or turn it on, because its runs use the logins of its owner.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: {
    ...ownerAutomation,
    automation: 'dependency-updates',
    runs: 'weekly',
  },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
