import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const adminAutomation = defineScreen({
  title: 'Seen by an admin',
  description:
    "Cal, an admin, reads Priya's weekly automation, which uses a Codex model. Turn off and Delete are the only actions. Under the prompt, a read-only line says that runs can use VERCEL_TOKEN with no question. The automation has no pull request trigger, so no hint shows.",
  rationale:
    'An admin can turn an automation off and delete it, from decision 502 B, but cannot change it or turn it on, because its runs use the logins of its owner. For the same reason, only the owner changes the secrets that the runs use, so an admin reads them as each member does, from a design call of 18 November 2026 for automation capabilities. The hint shows only while the automation has a pull request trigger, from automation capabilities decision 3 A.',
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
