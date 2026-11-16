import { defineScreen } from '@mokly/mokly'
import { AutomationScreen } from '../../../../../screens/AutomationScreen'
import {
  ownerAutomation,
  automationStateSchema,
} from '../../../../../screens/automationState'

export const unavailableAutomation = defineScreen({
  title: 'Not available',
  description:
    'The page of an automation that Acme no longer has, because someone deleted it or the address is wrong. The page keeps Automation as its name, and it says that this automation is not available. Open Automations opens the list of the automations of Acme. The page has no tabs, no Runs list, and no actions.',
  rationale:
    'A deleted automation cannot come back, so the page offers only the way to the list. A read of the automation that finds no automation shows this page, also on a page that was open when someone deleted the automation elsewhere. The run workspaces of a deleted automation stay, because they are normal workspaces, from decision 504 A.',
  relatedDocs: [],
  propSchema: automationStateSchema,
  props: { ...ownerAutomation, read: 'unavailable' },
  render: (props, context) => (
    <AutomationScreen state={props} viewport={context.viewport} />
  ),
})
