import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const memberAutomation = defineScreen({
  title: 'Seen by a member',
  description:
    "Priya, a member who is not an admin, reads Cal's automation: its facts, its triggers, its prompt with the model, and its runs, without fields and without actions. One line says that only Cal can change it.",
  rationale:
    'Every member sees each automation, its prompt, and its runs, as the user chose in decision 502 B. A run acts as its owner, so only the owner decides what runs on those logins.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, viewer: 'member' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
