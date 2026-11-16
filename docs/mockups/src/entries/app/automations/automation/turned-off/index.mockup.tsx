import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const turnedOffAutomation = defineScreen({
  title: 'Turned off after failed runs',
  description:
    "Cal's hourly automation Triage new errors, after its last three runs failed because Cal's Claude login is not connected. The automation is off, and a notice says why and what to do. The Runs list shows the three failed runs at the top, each with its cause and Connect Claude. Cal can fix the login, turn the automation on, use Run now, or delete it.",
  rationale:
    'The user chose option B of decision 513 on 9 November 2026: an automation turns off after three runs in a row fail. A failed check, a failed start, and a failed first turn each count, and a finished first turn resets the count. Only the owner turns the automation on again. The check of the agent login failed these runs before the create, so they have no workspace, and each row shows its cause and a link that fixes it, from decision 512 B.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, automation: 'error-triage', runs: 'turned-off' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
