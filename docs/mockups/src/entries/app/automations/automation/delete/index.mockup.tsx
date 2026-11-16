import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const deleteAutomation = defineScreen({
  title: 'Delete an automation',
  description:
    'Cal pressed Delete on his automation that reviews pull requests. A question asks first: its triggers and prompt are deleted, and its run workspaces stay. Cancel keeps the automation, and Delete automation deletes it and opens the Automations list. A phone asks in a sheet, after Delete automation at the end of the form.',
  rationale:
    'A deleted automation cannot come back, so Delete asks first, as Delete org does. An admin who is not the owner gets the same question. A deleted automation keeps its run workspaces, because they are normal workspaces, as the user chose in decision 504 A.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, dialog: 'delete' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
